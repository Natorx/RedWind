/* src-tauri/src/mods/channel.rs
description: 「频道」模块 —— 记录在媒体平台上关注的账号及其喜欢的视频

数据结构：
  Channel      一条记录，可能是「博主」或「视频」两种类型之一
               kind = "blogger" 关注的账号（头像、账号名、账号ID、平台、类型、简介）
               kind = "video"   单条视频（视频名放 name，链接放 homepage_url）
  ChannelVideo 博主账号下用户喜欢的视频（视频链接、视频名）

Channel 与 ChannelVideo 是一对多关系，删除 Channel 时级联删除其视频。
「视频」类型仅占用 Channel 本身，不涉及 ChannelVideo。
*/

use rusqlite::{params, Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use crate::mods::path_set;

/// 条目类型：博主账号
pub const KIND_BLOGGER: &str = "blogger";
/// 条目类型：单条视频
pub const KIND_VIDEO: &str = "video";

/// 一条频道记录（博主或单条视频）
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Channel {
    pub id: i64,
    /// 条目的类型：`blogger`（博主）或 `video`（单条视频）
    pub kind: String,
    /// 头像：可为本地文件路径或图片 URL。
    /// 博主类型用于展示头像；视频类型可作为封面，允许为空。
    pub avatar: String,
    /// 博主类型填账号名；视频类型填视频名
    pub name: String,
    /// 平台内的账号 ID / 唯一标识
    pub account_id: String,
    /// 博主个人主页的完整链接，如 https://space.bilibili.com/123456
    pub homepage_url: String,
    /// 平台，如 Bilibili、YouTube、小红书
    pub platform: String,
    /// 内容类型/题材，如 情感、做饭、游戏、知识
    pub category: String,
    /// 简介
    pub description: String,
    /// 创建时间（RFC3339）
    pub created_at: String,
}

/// 该账号下用户喜欢的视频
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChannelVideo {
    pub id: i64,
    /// 所属频道
    pub channel_id: i64,
    /// 视频链接
    pub url: String,
    /// 视频名
    pub title: String,
    /// 排序序号
    pub order_index: i64,
}

/// 新增频道时的入参（id / created_at 由数据库生成）
#[derive(Debug, Deserialize)]
pub struct NewChannel {
    /// `blogger` 或 `video`；缺省按博主处理以兼容旧调用
    #[serde(default = "default_kind")]
    pub kind: String,
    pub avatar: String,
    pub name: String,
    pub account_id: String,
    pub homepage_url: String,
    pub platform: String,
    pub category: String,
    pub description: String,
}

fn default_kind() -> String {
    KIND_BLOGGER.to_string()
}

/// 把外部传入的 kind 规整为已知取值；未知值一律回退为博主，
/// 避免脏数据写进库里导致筛选失效。
fn normalize_kind(kind: &str) -> String {
    match kind.trim().to_ascii_lowercase().as_str() {
        KIND_VIDEO => KIND_VIDEO.to_string(),
        _ => KIND_BLOGGER.to_string(),
    }
}

/// 更新频道时的入参（仅更新传入的字段）
#[derive(Debug, Deserialize)]
pub struct ChannelPatch {
    pub kind: Option<String>,
    pub avatar: Option<String>,
    pub name: Option<String>,
    pub account_id: Option<String>,
    pub homepage_url: Option<String>,
    pub platform: Option<String>,
    pub category: Option<String>,
    pub description: Option<String>,
}

pub struct ChannelDbState {
    pub conn: Mutex<Connection>,
}

impl ChannelDbState {
    pub fn new(conn: Connection) -> Self {
        ChannelDbState {
            conn: Mutex::new(conn),
        }
    }
}

/// 建表：channel 与 channel_video
pub fn init_channel_table(conn: &Connection) -> SqliteResult<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS channels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kind TEXT NOT NULL DEFAULT 'blogger',
            avatar TEXT NOT NULL DEFAULT '',
            name TEXT NOT NULL,
            account_id TEXT NOT NULL DEFAULT '',
            homepage_url TEXT NOT NULL DEFAULT '',
            platform TEXT NOT NULL DEFAULT '',
            category TEXT NOT NULL DEFAULT '',
            description TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS channel_videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id INTEGER NOT NULL,
            url TEXT NOT NULL DEFAULT '',
            title TEXT NOT NULL DEFAULT '',
            order_index INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // 按频道查询视频是主要读取路径
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_channel_videos_channel_id
         ON channel_videos(channel_id)",
        [],
    )?;

    // 迁移：为旧版本创建的 channels 表补上新增列。
    // CREATE TABLE IF NOT EXISTS 不会修改已存在的表结构，
    // 因此老用户的 channel.db 需要显式 ALTER。
    let existing_columns = {
        let mut stmt = conn.prepare("PRAGMA table_info(channels)")?;
        let mut names = Vec::new();
        let mut rows = stmt.query([])?;
        while let Some(row) = rows.next()? {
            let column_name: String = row.get(1)?;
            names.push(column_name);
        }
        names
    };

    // homepage_url：v0.6 早期版本创建的库没有这一列
    if !existing_columns.iter().any(|c| c == "homepage_url") {
        conn.execute(
            "ALTER TABLE channels ADD COLUMN homepage_url TEXT NOT NULL DEFAULT ''",
            [],
        )?;
    }

    // kind：区分「博主」与「视频」。DEFAULT 'blogger' 让已有记录
    // 自动归为博主，符合"现在都是博主"的既有数据形态。
    if !existing_columns.iter().any(|c| c == "kind") {
        conn.execute(
            "ALTER TABLE channels ADD COLUMN kind TEXT NOT NULL DEFAULT 'blogger'",
            [],
        )?;
    }

    Ok(())
}

/// 打开数据库文件并建表
pub fn init_channel_database() -> Result<ChannelDbState, String> {
    let dev_mode = std::env::var("dev_mode")
        .map(|val| val.eq_ignore_ascii_case("true"))
        .unwrap_or(false);

    let app_dir = if dev_mode {
        path_set::get_dev_data_dir().map_err(|e| e.to_string())?
    } else {
        path_set::get_prod_data_dir_channel()
    };

    let db_path = app_dir.join("channel.db");
    println!("channel database path: {}", db_path.display());

    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // 外键约束默认关闭，需显式开启，否则级联删除不生效
    conn.execute("PRAGMA foreign_keys = ON", [])
        .map_err(|e| e.to_string())?;

    init_channel_table(&conn).map_err(|e| e.to_string())?;

    Ok(ChannelDbState::new(conn))
}

/// 启动时初始化；失败则退回内存库，保证应用仍可运行
pub fn init_channel_db_state() -> ChannelDbState {
    match init_channel_database() {
        Ok(state) => state,
        Err(e) => {
            eprintln!("Failed to initialize channel database: {}", e);
            let conn = Connection::open_in_memory().unwrap();
            let _ = conn.execute("PRAGMA foreign_keys = ON", []);
            let _ = init_channel_table(&conn);
            ChannelDbState::new(conn)
        }
    }
}

/// 获取全部频道，并附带各自的视频列表
#[tauri::command]
pub fn get_channels(
    state: State<'_, ChannelDbState>,
) -> Result<Vec<(Channel, Vec<ChannelVideo>)>, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT id, kind, avatar, name, account_id, homepage_url, platform, category, description, created_at
             FROM channels ORDER BY created_at DESC, id DESC",
        )
        .map_err(|e| e.to_string())?;

    let channels = stmt
        .query_map([], |row| {
            Ok(Channel {
                id: row.get(0)?,
                kind: row.get(1)?,
                avatar: row.get(2)?,
                name: row.get(3)?,
                account_id: row.get(4)?,
                homepage_url: row.get(5)?,
                platform: row.get(6)?,
                category: row.get(7)?,
                description: row.get(8)?,
                created_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<SqliteResult<Vec<_>>>()
        .map_err(|e| e.to_string())?;

    let mut result = Vec::with_capacity(channels.len());
    for channel in channels {
        let videos = query_videos_by_channel(&conn, channel.id)?;
        result.push((channel, videos));
    }

    Ok(result)
}

/// 按 channel_id 读取视频，按 order_index 再按 id 排序
fn query_videos_by_channel(
    conn: &Connection,
    channel_id: i64,
) -> Result<Vec<ChannelVideo>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, channel_id, url, title, order_index
             FROM channel_videos WHERE channel_id = ?
             ORDER BY order_index ASC, id ASC",
        )
        .map_err(|e| e.to_string())?;

    // 注意：必须先把 rows 绑定到变量再 collect，
    // 否则链式调用中 stmt 的生命周期不满足借用检查。
    let rows = stmt
        .query_map(params![channel_id], |row| {
            Ok(ChannelVideo {
                id: row.get(0)?,
                channel_id: row.get(1)?,
                url: row.get(2)?,
                title: row.get(3)?,
                order_index: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<SqliteResult<Vec<_>>>()
        .map_err(|e| e.to_string())
}

/// 新增频道，返回新记录 id
#[tauri::command]
pub fn add_channel(
    state: State<'_, ChannelDbState>,
    channel: NewChannel,
) -> Result<i64, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let created_at = chrono::Local::now().to_rfc3339();

    conn.execute(
        "INSERT INTO channels
            (kind, avatar, name, account_id, homepage_url, platform, category, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            normalize_kind(&channel.kind),
            channel.avatar,
            channel.name,
            channel.account_id,
            channel.homepage_url,
            channel.platform,
            channel.category,
            channel.description,
            created_at,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

/// 更新频道，仅更新传入的字段；返回是否有行被修改
#[tauri::command]
pub fn update_channel(
    state: State<'_, ChannelDbState>,
    id: i64,
    patch: ChannelPatch,
) -> Result<bool, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let mut updates: Vec<&str> = Vec::new();
    let mut values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(v) = patch.kind {
        updates.push("kind = ?");
        values.push(Box::new(normalize_kind(&v)));
    }
    if let Some(v) = patch.avatar {
        updates.push("avatar = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = patch.name {
        updates.push("name = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = patch.account_id {
        updates.push("account_id = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = patch.homepage_url {
        updates.push("homepage_url = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = patch.platform {
        updates.push("platform = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = patch.category {
        updates.push("category = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = patch.description {
        updates.push("description = ?");
        values.push(Box::new(v));
    }

    if updates.is_empty() {
        return Ok(false);
    }

    values.push(Box::new(id));
    let sql = format!("UPDATE channels SET {} WHERE id = ?", updates.join(", "));
    let refs: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| &**v).collect();

    let affected = conn
        .execute(&sql, refs.as_slice())
        .map_err(|e| e.to_string())?;

    Ok(affected > 0)
}

/// 删除频道（其视频由外键级联删除）
#[tauri::command]
pub fn delete_channel(state: State<'_, ChannelDbState>, id: i64) -> Result<bool, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let affected = conn
        .execute("DELETE FROM channels WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;

    Ok(affected > 0)
}

/// 新增一条视频记录
#[tauri::command]
pub fn add_channel_video(
    state: State<'_, ChannelDbState>,
    channel_id: i64,
    url: String,
    title: String,
) -> Result<i64, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    // 新视频追加到末尾
    let next_order: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(order_index), -1) + 1 FROM channel_videos WHERE channel_id = ?",
            params![channel_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO channel_videos (channel_id, url, title, order_index) VALUES (?, ?, ?, ?)",
        params![channel_id, url, title, next_order],
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

/// 更新一条视频记录
#[tauri::command]
pub fn update_channel_video(
    state: State<'_, ChannelDbState>,
    id: i64,
    url: Option<String>,
    title: Option<String>,
) -> Result<bool, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let mut updates: Vec<&str> = Vec::new();
    let mut values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(v) = url {
        updates.push("url = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = title {
        updates.push("title = ?");
        values.push(Box::new(v));
    }

    if updates.is_empty() {
        return Ok(false);
    }

    values.push(Box::new(id));
    let sql = format!("UPDATE channel_videos SET {} WHERE id = ?", updates.join(", "));
    let refs: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| &**v).collect();

    let affected = conn
        .execute(&sql, refs.as_slice())
        .map_err(|e| e.to_string())?;

    Ok(affected > 0)
}

/// 删除一条视频记录
#[tauri::command]
pub fn delete_channel_video(state: State<'_, ChannelDbState>, id: i64) -> Result<bool, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let affected = conn
        .execute("DELETE FROM channel_videos WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;

    Ok(affected > 0)
}
