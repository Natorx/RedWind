// src-tauri/src/main.rs
// 在非调试构建时，隐藏 Windows 控制台窗口
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Commands
#[path = "mods/commands.rs"]
mod commands;
use commands::{execute_shell, get_current_dir, change_dir};

// SQLite and sidebar
use rusqlite::Connection;
#[path = "mods/sidebar.rs"]
mod sidebar;
use sidebar::{ DbState, get_sidebar_items, update_sidebar_item, add_sidebar_item, delete_sidebar_item, update_sidebar_items_order};

// 英语练习模块
#[path = "mods/typing.rs"]
mod typing;
use typing::{
    get_custom_word_sets, save_custom_word_set, delete_custom_word_set, 
    update_custom_word_set, get_custom_word_set, get_word_meaning, 
    get_all_meanings, update_word_meaning, batch_update_meanings, delete_word_meaning
};

// 硬件信息模块
use std::sync::Mutex;
use sysinfo::System;
#[path = "mods/hardinfo.rs"]
mod hardinfo;
use hardinfo::{AppState, get_hardware_info};

// 文件转换模块
#[path = "mods/conversion.rs"]
mod conversion;
use conversion::convert_file;

#[path = "database/init_sidebar.rs"]
mod db_sidebar;
use db_sidebar::init_db_state;
#[path = "database/init_typing.rs"]
mod db_typing;
use db_typing::init_typing_db_state;

fn main() {
    let db_state = db_sidebar::init_db_state();
    let typing_db_state = db_typing::init_typing_db_state();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            sys: Mutex::new(System::new_all()),
        })
        .manage(db_state)
        .manage(typing_db_state)
        .invoke_handler(tauri::generate_handler![
            // 命令相关
            execute_shell,
            get_current_dir,
            change_dir,
            // 硬件信息
            get_hardware_info,
            // 文件转换
            convert_file,
            // 侧边栏相关
            get_sidebar_items,
            update_sidebar_item,
            add_sidebar_item,
            delete_sidebar_item,
            update_sidebar_items_order,
            // 自定义词汇集相关
            get_custom_word_set,
            get_custom_word_sets,
            save_custom_word_set,
            delete_custom_word_set,
            update_custom_word_set,
            // 字典相关（新增）
            get_word_meaning,
            get_all_meanings,
            update_word_meaning,
            batch_update_meanings,
            delete_word_meaning,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}