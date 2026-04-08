// src-tauri/src/mods/sqlite.rs
use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SidebarItem {
    pub id: String,
    pub label: String,
    pub icon: String,
    pub order: i32,
    pub source: String,
}

pub struct DbState {
    pub conn: Mutex<Connection>,
}

pub fn init_db() -> Result<DbState> {
    let mut db_path = std::env::temp_dir();
    db_path.push("red-wind-project.db");
    let conn = Connection::open(db_path)?;
    
    // 创建表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS sidebar_items (
            id TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            icon TEXT NOT NULL,
            order_num INTEGER NOT NULL,
            source TEXT NOT NULL
        )",
        [],
    )?;
    
    // 检查并插入默认数据
    let count: i32 = conn.query_row("SELECT COUNT(*) FROM sidebar_items", [], |row| row.get(0))?;
    
    if count == 0 {
        let default_items = [
            ("func-store", "功能配置", "", 0, "local"),
            ("dashboard", "仪表盘", "📊", 1, "server"),
        ];
        
        for (id, label, icon, order, source) in default_items {
            conn.execute(
                "INSERT INTO sidebar_items (id, label, icon, order_num, source) VALUES (?, ?, ?, ?, ?)",
                params![id, label, icon, order, source],
            )?;
        }
    }
    
    Ok(DbState {
        conn: Mutex::new(conn),
    })
}

#[tauri::command]
pub fn get_sidebar_items(db_state: State<DbState>) -> Result<Vec<SidebarItem>, String> {
    let conn = db_state.conn.lock().map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare("SELECT id, label, icon, order_num, source FROM sidebar_items ORDER BY order_num")
        .map_err(|e| e.to_string())?;
    
    let items = stmt.query_map([], |row| {
        Ok(SidebarItem {
            id: row.get(0)?,
            label: row.get(1)?,
            icon: row.get(2)?,
            order: row.get(3)?,
            source: row.get(4)?,
        })
    })
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;
    
    Ok(items)
}

#[tauri::command]
pub fn update_sidebar_item(
    db_state: State<DbState>,
    id: String,
    label: Option<String>,
    icon: Option<String>,
    order: Option<i32>,
    source: Option<String>,
) -> Result<bool, String> {
    let mut conn = db_state.conn.lock().map_err(|e| e.to_string())?;
    
    // 构建动态更新语句
    let mut updates = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(label) = label {
        updates.push("label = ?");
        params.push(Box::new(label));
    }

    if let Some(icon) = icon {
        updates.push("icon = ?");
        params.push(Box::new(icon));
    }

    if let Some(order) = order {
        updates.push("order_num = ?");
        params.push(Box::new(order));
    }

    if let Some(source) = source {
        updates.push("source = ?");
        params.push(Box::new(source));
    }

    if updates.is_empty() {
        return Ok(false);
    }

    params.push(Box::new(id.clone()));

    let update_query = format!(
        "UPDATE sidebar_items SET {} WHERE id = ?",
        updates.join(", ")
    );

    let rusqlite_params: Vec<&dyn rusqlite::ToSql> = params
        .iter()
        .map(|p| &**p)
        .collect();

    let affected_rows = conn.execute(&update_query, rusqlite_params.as_slice())
        .map_err(|e| e.to_string())?;

    Ok(affected_rows > 0)
}

#[tauri::command]
pub fn add_sidebar_item(
    db_state: State<DbState>,
    id: String,
    label: String,
    icon: String,
    order: i32,
    source: String,
) -> Result<bool, String> {
    let mut conn = db_state.conn.lock().map_err(|e| e.to_string())?;
    
    let result = conn.execute(
        "INSERT INTO sidebar_items (id, label, icon, order_num, source) VALUES (?, ?, ?, ?, ?)",
        params![id, label, icon, order, source],
    ).map_err(|e| e.to_string())?;

    Ok(result > 0)
}

#[tauri::command]
pub fn delete_sidebar_item(
    db_state: State<DbState>,
    id: String,
) -> Result<bool, String> {
    let mut conn = db_state.conn.lock().map_err(|e| e.to_string())?;
    
    let result = conn.execute(
        "DELETE FROM sidebar_items WHERE id = ?",
        params![id],
    ).map_err(|e| e.to_string())?;

    Ok(result > 0)
}

#[tauri::command]
pub fn update_sidebar_items_order(
    db_state: State<DbState>,
    items: Vec<(String, i32)>,
) -> Result<bool, String> {
    let mut conn = db_state.conn.lock().map_err(|e| e.to_string())?;
    
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    for (id, order) in items {
        tx.execute(
            "UPDATE sidebar_items SET order_num = ? WHERE id = ?",
            params![order, id],
        ).map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(true)
}
