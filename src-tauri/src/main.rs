// src-tauri/src/main.rs
// 在非调试构建时，隐藏 Windows 控制台窗口
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod mods;
use mods::commands::{change_dir, execute_shell, get_current_dir};
// 硬件信息模块
use mods::hardinfo::{get_hardware_info, AppState};
use std::sync::Mutex;
use sysinfo::System;
// 文件转换模块
use mods::conversion::convert_file;
// 侧栏模块
use mods::sidebar::{
    add_sidebar_item, delete_sidebar_item, get_sidebar_items, update_sidebar_item,
    update_sidebar_items_order, DbState,
};
use rusqlite::Connection;
// 英语练习模块
use mods::typing::{
    batch_update_meanings, delete_custom_word_set, delete_word_meaning, get_all_meanings,
    get_custom_word_set, get_custom_word_sets, get_word_meaning, save_custom_word_set,
    update_custom_word_set, update_word_meaning,
};
// Node子进程模块
use mods::node_server::{get_server_status, start_server, stop_server, ServerState};

mod database;
use database::init_sidebar::init_db_state;
use database::init_typing::init_typing_db_state;

fn main() {
    let db_state = init_db_state();
    let typing_db_state = init_typing_db_state();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            sys: Mutex::new(System::new_all()),
        })
        .manage(ServerState::default())
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
            // Node子进程
            get_server_status,
            start_server,
            stop_server
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
