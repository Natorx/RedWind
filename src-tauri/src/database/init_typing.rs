// src/database/init_typing.rs
use crate::mods::typing;
use crate::mods::typing::DbState as TypingDbState;
use rusqlite::Connection;

pub fn init_typing_db_state() -> TypingDbState {
    match typing::init_typing_database() {
        Ok(state) => state,
        Err(e) => {
            eprintln!("Failed to initialize typing database: {}", e);
            // 使用内存数据库作为后备
            let conn = Connection::open_in_memory().unwrap();
            let _ = typing::init_typing_table(&conn);
            let _ = typing::init_dictionary_table(&conn);
            let _ = typing::init_default_dictionary(&conn);
            TypingDbState::new(conn)
        }
    }
}