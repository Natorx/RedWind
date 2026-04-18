// src/database/init_sidebar.rs
use crate::DbState;
use rusqlite::{Connection, params};
use std::sync::Mutex;

pub fn init_db_state() -> DbState {
    match init_db() {
        Ok(state) => state,
        Err(e) => {
            eprintln!("Failed to initialize database: {}", e);
            DbState {
                conn: Mutex::new(Connection::open_in_memory().unwrap()),
            }
        }
    }
}

pub fn init_db() -> Result<DbState, Box<dyn std::error::Error>> {
    let mut db_path = std::env::temp_dir();
    println!("数据库路径: {}", db_path.display());
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