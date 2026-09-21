use rusqlite::{params, Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::command;
use crate::mods::path_set;

// ============================================================
// 打字练习的数据单元：段落
//
// 演进说明：
//   1) 早期：word_sets / word_set_items（词汇集 / 单词）
//   2) 中期：passage_sets / passage_set_items（段落集 / 段落）
//   3) 现在：passages（直接就是一条条段落，段落本身足够长，相当于小作文）
//
// 旧结构的数据会在启动时自动迁移到 passages 表。
// ============================================================

/// 一条练习段落
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Passage {
    pub id: i32,
    /// 段落标题（可为空）
    pub title: String,
    /// 段落正文，打字练习的目标文本
    pub content: String,
    /// 是否为内置段落
    pub is_official: bool,
    /// 排序序号
    pub order_index: i32,
    pub created_at: String,
}

// 数据库状态
pub struct DbState {
    pub conn: Mutex<Connection>,
}

impl DbState {
    pub fn new(conn: Connection) -> Self {
        DbState {
            conn: Mutex::new(conn),
        }
    }
}

// 获取应用数据目录的辅助函数
pub(crate) fn get_app_data_dir() -> std::path::PathBuf {
    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(parent) = current_exe.parent() {
            return parent.join("data");
        }
    }
    std::path::PathBuf::from(".")
}

// ------------------------------------------------------------
// 建表
// ------------------------------------------------------------
pub fn init_typing_table(conn: &Connection) -> SqliteResult<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS passages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL DEFAULT '',
            content TEXT NOT NULL,
            is_official INTEGER NOT NULL DEFAULT 0,
            order_index INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    Ok(())
}

/// 判断某张表是否存在
fn table_exists(conn: &Connection, table: &str) -> bool {
    conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
        params![table],
        |row| row.get::<_, i64>(0),
    )
    .map(|c| c > 0)
    .unwrap_or(false)
}

// ------------------------------------------------------------
// 迁移：把旧的「段落集 / 词汇集」结构摊平成一段一段的 passages
//
// 迁移规则：旧结构里的每一个条目（无论来自词汇集还是段落集）
// 都对应新表里的一条段落。旧集合的名称作为该段落的标题前缀保留，
// 避免同一批内容混淆。
// ------------------------------------------------------------
pub fn migrate_legacy_structures(conn: &Connection) -> SqliteResult<()> {
    let has_new_content: i64 = conn.query_row("SELECT COUNT(*) FROM passages", [], |row| row.get(0))?;
    if has_new_content > 0 {
        return Ok(());
    }

    let mut migrated = 0usize;

    // ---- 来源 A：passage_sets / passage_set_items ----
    if table_exists(conn, "passage_sets") && table_exists(conn, "passage_set_items") {
        let sets: Vec<(i32, String)> = {
            let mut stmt = conn.prepare("SELECT id, name FROM passage_sets ORDER BY id")?;
            let rows = stmt.query_map([], |row| {
                Ok((row.get::<_, i32>(0)?, row.get::<_, String>(1)?))
            })?;
            let mut out = Vec::new();
            for r in rows {
                out.push(r?);
            }
            out
        };

        for (set_id, set_name) in sets {
            let items: Vec<(String, String)> = {
                let mut stmt = conn.prepare(
                    "SELECT title, content FROM passage_set_items
                     WHERE passage_set_id = ?1 ORDER BY order_index",
                )?;
                let rows = stmt.query_map(params![set_id], |row| {
                    Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
                })?;
                let mut out = Vec::new();
                for r in rows {
                    out.push(r?);
                }
                out
            };

            for (old_title, content) in items {
                if content.trim().is_empty() {
                    continue;
                }
                let title = if old_title.trim().is_empty() {
                    set_name.clone()
                } else {
                    format!("{} · {}", set_name, old_title.trim())
                };
                insert_passage(conn, &title, content.trim(), migrated)?;
                migrated += 1;
            }
        }
    }

    // ---- 来源 B：word_sets / word_set_items（更早的词汇集） ----
    if table_exists(conn, "word_sets") && table_exists(conn, "word_set_items") {
        let sets: Vec<(i32, String)> = {
            let mut stmt = conn.prepare("SELECT id, name FROM word_sets ORDER BY id")?;
            let rows = stmt.query_map([], |row| {
                Ok((row.get::<_, i32>(0)?, row.get::<_, String>(1)?))
            })?;
            let mut out = Vec::new();
            for r in rows {
                out.push(r?);
            }
            out
        };

        for (set_id, set_name) in sets {
            let items: Vec<(String, String, Option<String>)> = {
                let mut stmt = conn.prepare(
                    "SELECT word, meaning, example_sentence FROM word_set_items
                     WHERE word_set_id = ?1 ORDER BY order_index",
                )?;
                let rows = stmt.query_map(params![set_id], |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, Option<String>>(2)?,
                    ))
                })?;
                let mut out = Vec::new();
                for r in rows {
                    out.push(r?);
                }
                out
            };

            for (word, meaning, example) in items {
                // 旧单词条目：有例句用例句，否则退回单词本身
                let content = match example {
                    Some(ref s) if !s.trim().is_empty() => s.trim().to_string(),
                    _ => word.clone(),
                };
                let title = if meaning.trim().is_empty() {
                    format!("{} · {}", set_name, word)
                } else {
                    format!("{} · {} ({})", set_name, word, meaning.trim())
                };
                insert_passage(conn, &title, &content, migrated)?;
                migrated += 1;
            }
        }
    }

    if migrated > 0 {
        println!("旧数据已迁移为 {} 条独立段落。", migrated);
    }

    Ok(())
}

fn insert_passage(conn: &Connection, title: &str, content: &str, order: usize) -> SqliteResult<()> {
    let created_at = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "INSERT INTO passages (title, content, is_official, order_index, created_at)
         VALUES (?1, ?2, 0, ?3, ?4)",
        params![title, content, order as i32, created_at],
    )?;
    Ok(())
}

// ------------------------------------------------------------
// 内置段落：只保留两条英文样例（小作文长度），其余内容由用户自行添加
// ------------------------------------------------------------
const DEFAULT_PASSAGES: [(&str, &str); 2] = [
    (
        "The Quiet Morning",
        "The morning arrives without ceremony. Light moves slowly across the floor, inch by inch, until the whole room is awake. Outside, the street is still quiet enough to hear a bicycle passing, and somewhere a kettle begins to sing. I have learned to treat these first minutes carefully, because they set the tone for everything that follows. If I sit still and let the day come to me instead of chasing it, the hours tend to arrange themselves more kindly. There is no trick to this, no technique worth writing down. It is simply a matter of paying attention to what is already here, and being willing to begin again.",
    ),
    (
        "On Reading Slowly",
        "We are told constantly that we should read more, as though the number of books were the point. But a book read quickly is often a book not read at all. The sentences pass through us without leaving a mark, and we close the cover with the vague feeling that we have been busy rather than changed. Reading slowly is a form of respect, both for the writer and for ourselves. It means stopping at a paragraph that surprises us, going back to a sentence that seems too good to be true, and letting an idea sit in the mind long enough to disagree with it. Speed is useful for many things. Understanding is not one of them.",
    ),
];

/// 让库中的内置段落与代码里的 DEFAULT_PASSAGES 保持一致。
///
/// 以「标题」为对齐键：
///   - 代码里有、库里没有  -> 插入
///   - 代码里有、库里也有  -> 更新正文与顺序
///   - 代码里没有、库里有  -> 删除（仅限 is_official = 1）
///
/// 用户自己添加的段落（is_official = 0）永远不会被这个函数触碰。
pub fn sync_default_passages(conn: &Connection) -> SqliteResult<()> {
    let created_at = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // 库中现有的内置段落：title -> id
    let existing: Vec<(i32, String)> = {
        let mut stmt = conn.prepare("SELECT id, title FROM passages WHERE is_official = 1")?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, i32>(0)?, row.get::<_, String>(1)?))
        })?;
        let mut out = Vec::new();
        for r in rows {
            out.push(r?);
        }
        out
    };

    let wanted: Vec<String> = DEFAULT_PASSAGES.iter().map(|(t, _)| t.to_string()).collect();
    let mut inserted = 0usize;
    let mut updated = 0usize;
    let mut removed = 0usize;

    // 先删除代码中已不存在（或不再内置）的条目
    for (id, title) in &existing {
        if !wanted.iter().any(|w| w == title) {
            conn.execute(
                "DELETE FROM passages WHERE id = ?1 AND is_official = 1",
                params![id],
            )?;
            removed += 1;
        }
    }

    // 再插入 / 更新
    for (index, (title, content)) in DEFAULT_PASSAGES.iter().enumerate() {
        match existing.iter().find(|(_, t)| t == title) {
            Some((id, _)) => {
                conn.execute(
                    "UPDATE passages SET content = ?1, order_index = ?2 WHERE id = ?3 AND is_official = 1",
                    params![content, index as i32, id],
                )?;
                updated += 1;
            }
            None => {
                conn.execute(
                    "INSERT INTO passages (title, content, is_official, order_index, created_at)
                     VALUES (?1, ?2, 1, ?3, ?4)",
                    params![title, content, index as i32, created_at],
                )?;
                inserted += 1;
            }
        }
    }

    if inserted + updated + removed > 0 {
        println!(
            "内置段落已同步：新增 {}，更新 {}，清理 {}。",
            inserted, updated, removed
        );
    }

    Ok(())
}

/// 一次性清理：早期版本把旧词库迁移成了一批「单词 + 释义」条目，
/// 它们不是真正的段落（标题形如「基础词汇 (50词) · apple」，正文极短），
/// 却以 is_official = 0 的形式混在自定义段落里。
///
/// 这里按特征识别并删除：标题含「 · 」且正文长度小于 100 字符。
/// 清理完成后写入标记表，避免重复扫描。
fn cleanup_migrated_word_residue(conn: &Connection) -> SqliteResult<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS typing_migrations (
            name TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL
        )",
        [],
    )?;

    let done: i64 = conn.query_row(
        "SELECT COUNT(*) FROM typing_migrations WHERE name = 'cleanup_word_residue'",
        [],
        |row| row.get(0),
    )?;
    if done > 0 {
        return Ok(());
    }

    let affected = conn.execute(
        "DELETE FROM passages
         WHERE is_official = 0
           AND title LIKE '% · %'
           AND LENGTH(content) < 100",
        [],
    )?;

    conn.execute(
        "INSERT INTO typing_migrations (name, applied_at) VALUES (?1, ?2)",
        params![
            "cleanup_word_residue",
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
        ],
    )?;

    if affected > 0 {
        println!("已清理 {} 条旧词库迁移残留。", affected);
    }

    Ok(())
}

// ------------------------------------------------------------
// 数据库初始化入口
// ------------------------------------------------------------
pub fn init_typing_database() -> Result<DbState, String> {
    let dev_mode = std::env::var("dev_mode")
        .map(|val| val.eq_ignore_ascii_case("true"))
        .unwrap_or(false);
    let app_dir = if dev_mode {
        path_set::get_dev_data_dir().map_err(|e| e.to_string())?
    } else {
        path_set::get_prod_data_dir_typing()
    };
    let db_path = app_dir.join("typing.db");
    println!("typing database path: {}", db_path.display());

    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    init_typing_table(&conn).map_err(|e| e.to_string())?;
    migrate_legacy_structures(&conn).map_err(|e| e.to_string())?;
    // 清理早期词库迁移留下的非段落数据（仅执行一次）
    cleanup_migrated_word_residue(&conn).map_err(|e| e.to_string())?;
    // 内置段落跟随代码同步：只影响 is_official = 1 的记录
    sync_default_passages(&conn).map_err(|e| e.to_string())?;

    Ok(DbState::new(conn))
}

pub fn init_typing_db_state() -> DbState {
    match init_typing_database() {
        Ok(state) => state,
        Err(e) => {
            eprintln!("Failed to initialize typing database: {}", e);
            // 使用内存数据库作为后备
            let conn = Connection::open_in_memory().unwrap();
            let _ = init_typing_table(&conn);
            let _ = sync_default_passages(&conn);
            DbState::new(conn)
        }
    }
}

// ------------------------------------------------------------
// Commands
// ------------------------------------------------------------

/// 获取全部段落（内置在前，自定义在后，各自按顺序）
#[command]
pub async fn get_all_passages(state: tauri::State<'_, DbState>) -> Result<Vec<Passage>, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT id, title, content, is_official, order_index, created_at FROM passages
             ORDER BY is_official DESC, order_index ASC, id ASC",
        )
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Passage {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                is_official: row.get::<_, i32>(3)? != 0,
                order_index: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| format!("Failed to query: {}", e))?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| format!("Failed to get row: {}", e))?);
    }

    Ok(result)
}

/// 新增一条段落
#[command]
pub async fn add_passage(
    state: tauri::State<'_, DbState>,
    title: String,
    content: String,
) -> Result<Passage, String> {
    let content = content.trim().to_string();
    if content.is_empty() {
        return Err("段落内容不能为空".to_string());
    }

    let created_at = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let next_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(order_index), -1) + 1 FROM passages WHERE is_official = 0",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    conn.execute(
        "INSERT INTO passages (title, content, is_official, order_index, created_at)
         VALUES (?1, ?2, 0, ?3, ?4)",
        params![title.trim(), content, next_order, created_at],
    )
    .map_err(|e| format!("Failed to insert passage: {}", e))?;

    let id = conn.last_insert_rowid() as i32;

    Ok(Passage {
        id,
        title: title.trim().to_string(),
        content,
        is_official: false,
        order_index: next_order,
        created_at,
    })
}

/// 一次新增多条段落
#[command]
pub async fn add_passages_batch(
    state: tauri::State<'_, DbState>,
    passages_json: String,
) -> Result<Vec<Passage>, String> {
    // 形如：[{"title": "标题", "content": "正文"}, ...]
    let items: Vec<serde_json::Value> =
        serde_json::from_str(&passages_json).map_err(|e| format!("无效的数据格式: {}", e))?;

    if items.is_empty() {
        return Err("至少需要一条段落".to_string());
    }

    let mut conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let transaction = conn
        .transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    let mut next_order: i32 = transaction
        .query_row(
            "SELECT COALESCE(MAX(order_index), -1) + 1 FROM passages WHERE is_official = 0",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let created_at = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let mut created: Vec<Passage> = Vec::new();

    for item in items.iter() {
        let content = item
            .get("content")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if content.is_empty() {
            continue;
        }
        let title = item
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();

        transaction
            .execute(
                "INSERT INTO passages (title, content, is_official, order_index, created_at)
                 VALUES (?1, ?2, 0, ?3, ?4)",
                params![title, content, next_order, created_at],
            )
            .map_err(|e| format!("Failed to insert passage: {}", e))?;

        let id = transaction.last_insert_rowid() as i32;
        created.push(Passage {
            id,
            title,
            content,
            is_official: false,
            order_index: next_order,
            created_at: created_at.clone(),
        });
        next_order += 1;
    }

    if created.is_empty() {
        return Err("所有段落内容均为空".to_string());
    }

    transaction
        .commit()
        .map_err(|e| format!("Failed to commit: {}", e))?;

    Ok(created)
}

/// 更新一条自定义段落
#[command]
pub async fn update_passage(
    state: tauri::State<'_, DbState>,
    id: i32,
    title: String,
    content: String,
) -> Result<(), String> {
    let content = content.trim().to_string();
    if content.is_empty() {
        return Err("段落内容不能为空".to_string());
    }

    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let is_official: i32 = conn
        .query_row(
            "SELECT is_official FROM passages WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to check passage: {}", e))?;

    if is_official == 1 {
        return Err("不能修改内置段落".to_string());
    }

    conn.execute(
        "UPDATE passages SET title = ?1, content = ?2 WHERE id = ?3",
        params![title.trim(), content, id],
    )
    .map_err(|e| format!("Failed to update passage: {}", e))?;

    Ok(())
}

/// 删除一条自定义段落
#[command]
pub async fn delete_passage(state: tauri::State<'_, DbState>, id: i32) -> Result<(), String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let is_official: i32 = conn
        .query_row(
            "SELECT is_official FROM passages WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to check passage: {}", e))?;

    if is_official == 1 {
        return Err("不能删除内置段落".to_string());
    }

    let affected = conn
        .execute("DELETE FROM passages WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete: {}", e))?;

    if affected == 0 {
        return Err("未找到指定的段落".to_string());
    }

    Ok(())
}
