// src-tauri/src/main.rs
// 在非调试构建时，隐藏 Windows 控制台窗口
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
mod mods;
use std::sync::Mutex;
use sysinfo::System;

fn main() {
    let db_state = mods::sidebar::init_db_state();
    let typing_db_state = mods::typing::init_typing_db_state();
    let p2p_state = mods::p2p_chat::P2PState::new();
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let config_manager = mods::rd_config::ConfigManager::new(app.handle());
            app.manage(config_manager);
            Ok(())
        })
        .manage(mods::hardinfo::AppState {
            sys: Mutex::new(System::new_all()),
        })
        .manage(mods::node_server::ServerState::default())
        .manage(db_state)
        .manage(p2p_state)
        .manage(typing_db_state)
        .invoke_handler(tauri::generate_handler![
            // Open模块
            mods::open::open_path,
            // 硬件信息
            mods::hardinfo::get_hardware_info,
            mods::hardinfo::get_process,
            mods::hardinfo::kill_process,
            // 文件转换
            mods::conversion::convert_file,
            // 侧边栏相关
            mods::sidebar::get_sidebar_items,
            mods::sidebar::update_sidebar_item,
            mods::sidebar::add_sidebar_item,
            mods::sidebar::delete_sidebar_item,
            mods::sidebar::update_sidebar_items_order,
            // 自定义词汇集相关 - 更新为新函数
            mods::typing::get_all_word_sets,
            mods::typing::get_word_set,
            mods::typing::save_custom_word_set,
            mods::typing::delete_custom_word_set,
            mods::typing::update_custom_word_set,
            mods::typing::get_word_meaning,
            // Node子进程
            mods::node_server::get_server_status,
            mods::node_server::start_server,
            mods::node_server::stop_server,
            // Windows Audio
            mods::win_audio_control::get_all_audio_sessions_cmd,
            mods::win_audio_control::get_system_volume_cmd,
            mods::win_audio_control::set_system_volume_cmd,
            mods::win_audio_control::set_app_volume_cmd,
            mods::win_audio_control::set_app_mute_cmd,
            // Config
            mods::rd_config::get_active_ui,
            mods::rd_config::set_active_ui,
            // printer
            mods::printer::print_text,
            mods::printer::test_connection,
            mods::printer::health_check,
            // p2p_chat
            mods::p2p_chat::p2p_status,
            mods::p2p_chat::send_p2p,
            mods::p2p_chat::stop_p2p,
            mods::p2p_chat::start_p2p,
            // Docs
            mods::docs::read_document,
            // file_handler
            mods::file_handler::export_json,
            mods::file_handler::save_file_bytes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
