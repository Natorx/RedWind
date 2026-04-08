// src-tauri/src/main.rs
// 在非调试构建时，隐藏 Windows 控制台窗口
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
// Commands
#[path = "mods/commands.rs"]
mod commands;
use commands::{execute_shell, get_current_dir, change_dir};

// SQLite
use rusqlite::Connection;
#[path = "mods/sqlite.rs"]
mod sqlite;
use sqlite::{init_db, DbState, get_sidebar_items, update_sidebar_item, add_sidebar_item, delete_sidebar_item, update_sidebar_items_order};

// Hardinfo
use std::sync::Mutex;
use sysinfo::System;
#[path = "mods/hardinfo.rs"]
mod hardinfo;
use hardinfo::{AppState, get_hardware_info};

#[path = "mods/conversion.rs"]
mod conversion;
use conversion::{convert_file};

fn main() {
    let db_state = match init_db() {
        Ok(state) => state,
        Err(e) => {
            eprintln!("Failed to initialize database: {}", e);
            // 创建一个空的DbState，但应用可能无法正常工作
            DbState {
                conn: Mutex::new(Connection::open_in_memory().unwrap()),
            }
        }
    };
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            sys: Mutex::new(System::new_all()),
        })
        .manage(db_state)
        .invoke_handler(tauri::generate_handler![
            execute_shell,
            get_current_dir,
            change_dir,
            get_hardware_info,
            convert_file,
            get_sidebar_items,
            update_sidebar_item,
            add_sidebar_item,
            delete_sidebar_item,
            update_sidebar_items_order
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
