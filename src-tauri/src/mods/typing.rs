use rusqlite::{params, Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::command;

// 词汇集结构
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WordSet {
    pub id: i32,
    pub name: String,
    pub words: String,
    pub is_official: bool,
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

// 初始化打字练习数据库
pub fn init_typing_database() -> Result<DbState, String> {
    let app_dir = get_app_data_dir();
    std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    let db_path = app_dir.join("typing_practice.db");
    println!("数据库路径: {}", db_path.display());

    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    init_typing_table(&conn).map_err(|e| e.to_string())?;
    init_dictionary_table(&conn).map_err(|e| e.to_string())?;
    init_default_dictionary(&conn).map_err(|e| e.to_string())?;

    Ok(DbState::new(conn))
}

// 获取应用数据目录的辅助函数
fn get_app_data_dir() -> std::path::PathBuf {
    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(parent) = current_exe.parent() {
            return parent.join("data");
        }
    }
    std::path::PathBuf::from(".")
}

// 初始化数据库表
pub fn init_typing_table(conn: &Connection) -> SqliteResult<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS custom_word_sets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            words TEXT NOT NULL,
            created_at TEXT NOT NULL
        )",
        [],
    )?;
    Ok(())
}

// 初始化字典表
pub fn init_dictionary_table(conn: &Connection) -> SqliteResult<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS word_dictionary (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT NOT NULL UNIQUE,
            meaning TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )?;
    Ok(())
}

// 初始化默认字典数据
pub fn init_default_dictionary(conn: &Connection) -> SqliteResult<()> {
    let count: i64 =
        conn.query_row("SELECT COUNT(*) FROM word_dictionary", [], |row| row.get(0))?;

    if count == 0 {
        let default_words: HashMap<&str, &str> = [
            ("apple", "苹果"),
            ("beautiful", "美丽的"),
            ("computer", "计算机"),
            ("developer", "开发者"),
            ("experience", "经验"),
            ("fantastic", "极好的"),
            ("github", "GitHub平台"),
            ("hello", "你好"),
            ("internet", "互联网"),
            ("javascript", "JavaScript编程语言"),
            ("knowledge", "知识"),
            ("learning", "学习"),
            ("mountain", "山"),
            ("network", "网络"),
            ("open source", "开源"),
            ("programming", "编程"),
            ("quality", "质量"),
            ("react", "React框架"),
            ("software", "软件"),
            ("technology", "技术"),
            ("unique", "独特的"),
            ("virtual", "虚拟的"),
            ("website", "网站"),
            ("xenial", "友好的"),
            ("youtube", "YouTube视频平台"),
            ("zealous", "热情的"),
            ("algorithm", "算法"),
            ("backend", "后端"),
            ("cloud", "云"),
            ("database", "数据库"),
            ("frontend", "前端"),
            ("git", "Git版本控制"),
            ("html", "HTML标记语言"),
            ("css", "CSS样式表"),
            ("typescript", "TypeScript编程语言"),
            ("python", "Python编程语言"),
            ("java", "Java编程语言"),
            ("rust", "Rust编程语言"),
            ("go", "Go编程语言"),
            ("swift", "Swift编程语言"),
            ("kotlin", "Kotlin编程语言"),
            ("ruby", "Ruby编程语言"),
            ("php", "PHP编程语言"),
            ("docker", "Docker容器平台"),
            ("kubernetes", "Kubernetes编排平台"),
            ("aws", "亚马逊云服务"),
            ("azure", "微软云平台"),
            ("mongodb", "MongoDB数据库"),
            ("postgresql", "PostgreSQL数据库"),
            ("redis", "Redis缓存数据库"),
            ("asynchronous", "异步的"),
            ("callback", "回调函数"),
            ("closure", "闭包"),
            ("compiler", "编译器"),
            ("dependency", "依赖"),
            ("encapsulation", "封装"),
            ("framework", "框架"),
            ("functional", "函数式的"),
            ("generics", "泛型"),
            ("immutable", "不可变的"),
            ("inheritance", "继承"),
            ("interface", "接口"),
            ("lambda", "Lambda表达式"),
            ("middleware", "中间件"),
            ("namespace", "命名空间"),
            ("optimization", "优化"),
            ("polymorphism", "多态"),
            ("queue", "队列"),
            ("recursion", "递归"),
            ("singleton", "单例模式"),
            ("thread", "线程"),
            ("variable", "变量"),
            ("webpack", "Webpack打包工具"),
            ("xml", "XML标记语言"),
            ("yaml", "YAML数据格式"),
            ("zero", "零"),
            ("boolean", "布尔值"),
            ("constant", "常量"),
            ("debugger", "调试器"),
            ("event loop", "事件循环"),
            ("factory", "工厂模式"),
            ("garbage", "垃圾回收"),
            ("hoisting", "变量提升"),
            ("iterator", "迭代器"),
            ("json", "JSON数据格式"),
            ("keyword", "关键字"),
            ("lexical", "词法的"),
            ("memoization", "记忆化"),
            ("nullable", "可空的"),
            ("object", "对象"),
        ]
        .iter()
        .cloned()
        .collect();

        let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

        for (word, meaning) in default_words {
            conn.execute(
                "INSERT INTO word_dictionary (word, meaning, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
                params![word, meaning, now, now],
            )?;
        }
    }

    Ok(())
}

// 获取所有自定义词汇集
#[command]
pub async fn get_custom_word_sets(
    state: tauri::State<'_, DbState>,
) -> Result<Vec<WordSet>, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, words, created_at FROM custom_word_sets ORDER BY created_at DESC",
        )
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let word_sets = stmt
        .query_map([], |row| {
            Ok(WordSet {
                id: row.get(0)?,
                name: row.get(1)?,
                words: row.get(2)?,
                is_official: false,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| format!("Failed to query: {}", e))?
        .collect::<SqliteResult<Vec<WordSet>>>()
        .map_err(|e| format!("Failed to collect results: {}", e))?;

    Ok(word_sets)
}

// 保存自定义词汇集
#[command]
pub async fn save_custom_word_set(
    state: tauri::State<'_, DbState>,
    name: String,
    words: String,
) -> Result<WordSet, String> {
    if name.trim().is_empty() {
        return Err("词汇集名称不能为空".to_string());
    }
    println!("保存词汇集 - 名称: {}, 单词: {}", name, words);

    // 验证 JSON 格式
    let words_array: Vec<String> =
        serde_json::from_str(&words).map_err(|e| format!("无效的单词格式: {}", e))?;

    if words_array.is_empty() {
        return Err("至少需要一个单词".to_string());
    }

    let created_at = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    conn.execute(
        "INSERT INTO custom_word_sets (name, words, created_at) VALUES (?1, ?2, ?3)",
        params![name, words, created_at],
    )
    .map_err(|e| format!("Failed to insert: {}", e))?;

    let id = conn.last_insert_rowid() as i32;

    Ok(WordSet {
        id,
        name,
        words,
        is_official: false,
        created_at,
    })
}

// 删除自定义词汇集
#[command]
pub async fn delete_custom_word_set(
    state: tauri::State<'_, DbState>,
    id: i32,
) -> Result<(), String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let affected = conn
        .execute("DELETE FROM custom_word_sets WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete: {}", e))?;

    if affected == 0 {
        return Err("未找到指定的词汇集".to_string());
    }

    Ok(())
}

// 更新自定义词汇集
#[command]
pub async fn update_custom_word_set(
    state: tauri::State<'_, DbState>,
    id: i32,
    name: String,
    words: String,
) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("词汇集名称不能为空".to_string());
    }

    let words_array: Vec<String> =
        serde_json::from_str(&words).map_err(|e| format!("无效的单词格式: {}", e))?;

    if words_array.is_empty() {
        return Err("至少需要一个单词".to_string());
    }

    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let affected = conn
        .execute(
            "UPDATE custom_word_sets SET name = ?1, words = ?2 WHERE id = ?3",
            params![name, words, id],
        )
        .map_err(|e| format!("Failed to update: {}", e))?;

    if affected == 0 {
        return Err("未找到指定的词汇集".to_string());
    }

    Ok(())
}

// 获取单个自定义词汇集
#[command]
pub async fn get_custom_word_set(
    state: tauri::State<'_, DbState>,
    id: i32,
) -> Result<Option<WordSet>, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT id, name, words, created_at FROM custom_word_sets WHERE id = ?1")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    match stmt.query_row(params![id], |row| {
        Ok(WordSet {
            id: row.get(0)?,
            name: row.get(1)?,
            words: row.get(2)?,
            is_official: false,
            created_at: row.get(3)?,
        })
    }) {
        Ok(word_set) => Ok(Some(word_set)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Failed to query: {}", e)),
    }
}

// ========== 字典相关命令 ==========

// 获取单词释义
#[command]
pub async fn get_word_meaning(
    state: tauri::State<'_, DbState>,
    word: String,
) -> Result<String, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let meaning: Option<String> = conn
        .query_row(
            "SELECT meaning FROM word_dictionary WHERE word = ?1",
            params![word.to_lowercase()],
            |row| row.get(0),
        )
        .ok();

    Ok(meaning.unwrap_or_else(|| "暂无释义".to_string()))
}

// 获取所有单词释义（返回 JSON 对象）
#[command]
pub async fn get_all_meanings(state: tauri::State<'_, DbState>) -> Result<String, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT word, meaning FROM word_dictionary ORDER BY word")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| format!("Failed to query: {}", e))?;

    let mut meanings = serde_json::Map::new();
    for row in rows {
        let (word, meaning) = row.map_err(|e| format!("Failed to get row: {}", e))?;
        meanings.insert(word, serde_json::Value::String(meaning));
    }

    // 添加调试输出
    println!("Loaded {} meanings from database", meanings.len());
    if meanings.len() > 0 {
        println!(
            "First few meanings: {:?}",
            meanings.iter().take(3).collect::<Vec<_>>()
        );
    }

    let json_obj = serde_json::Value::Object(meanings);
    Ok(json_obj.to_string())
}

// 更新单词释义
#[command]
pub async fn update_word_meaning(
    state: tauri::State<'_, DbState>,
    word: String,
    meaning: String,
) -> Result<(), String> {
    if word.trim().is_empty() {
        return Err("单词不能为空".to_string());
    }

    if meaning.trim().is_empty() {
        return Err("释义不能为空".to_string());
    }

    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let affected = conn.execute(
        "INSERT OR REPLACE INTO word_dictionary (word, meaning, created_at, updated_at) 
         VALUES (?1, ?2, COALESCE((SELECT created_at FROM word_dictionary WHERE word = ?1), ?3), ?4)",
        params![word.to_lowercase(), meaning, now, now],
    ).map_err(|e| format!("Failed to update: {}", e))?;

    if affected == 0 {
        return Err("更新失败".to_string());
    }

    Ok(())
}

// 批量更新单词释义
#[command]
pub async fn batch_update_meanings(
    state: tauri::State<'_, DbState>,
    meanings: String,
) -> Result<(), String> {
    let meanings_map: serde_json::Map<String, serde_json::Value> =
        serde_json::from_str(&meanings).map_err(|e| format!("无效的 JSON 格式: {}", e))?;

    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let mut conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let transaction = conn
        .transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    for (word, meaning_value) in meanings_map {
        let meaning = meaning_value.as_str().ok_or("释义必须是字符串")?;

        transaction.execute(
            "INSERT OR REPLACE INTO word_dictionary (word, meaning, created_at, updated_at) 
             VALUES (?1, ?2, COALESCE((SELECT created_at FROM word_dictionary WHERE word = ?1), ?3), ?4)",
            params![word.to_lowercase(), meaning, now, now],
        ).map_err(|e| format!("Failed to update word '{}': {}", word, e))?;
    }

    transaction
        .commit()
        .map_err(|e| format!("Failed to commit: {}", e))?;

    Ok(())
}

// 删除单词释义
#[command]
pub async fn delete_word_meaning(
    state: tauri::State<'_, DbState>,
    word: String,
) -> Result<(), String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let affected = conn
        .execute(
            "DELETE FROM word_dictionary WHERE word = ?1",
            params![word.to_lowercase()],
        )
        .map_err(|e| format!("Failed to delete: {}", e))?;

    if affected == 0 {
        return Err("未找到该单词".to_string());
    }

    Ok(())
}
