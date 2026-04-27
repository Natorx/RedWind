// src/database/init_sidebar.rs
use crate::DbState;
use rusqlite::{ Connection};
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

    Ok(DbState {
        conn: Mutex::new(conn),
    })
}