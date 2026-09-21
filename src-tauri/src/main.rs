// src-tauri/src/main.rs
// 在非调试构建时，隐藏 Windows 控制台窗口
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod mods;
use std::sync::Mutex;
use sysinfo::System;

fn main() {
    dotenv::dotenv().ok();
    let db_state = mods::sidebar::init_db_state();
    let typing_db_state = mods::typing::init_typing_db_state();
    let channel_db_state = mods::channel::init_channel_db_state();
    let p2p_state = mods::p2p_chat::P2PState::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(mods::hardinfo::AppState {
            sys: Mutex::new(System::new_all()),
        })
        .manage(mods::node_server::ServerState::default())
        .manage(db_state)
        .manage(p2p_state)
        .manage(typing_db_state)
        .manage(channel_db_state)
        .invoke_handler(tauri::generate_handler![
            // Open模块
            mods::open::open_path,
            mods::open::open_url,
            // 硬件信息
            mods::hardinfo::get_hardware_info,
            mods::hardinfo::get_process,
            mods::hardinfo::kill_process,
            // 侧边栏相关
            mods::sidebar::get_sidebar_items,
            mods::sidebar::update_sidebar_item,
            mods::sidebar::add_sidebar_item,
            mods::sidebar::delete_sidebar_item,
            mods::sidebar::update_sidebar_items_order,
            // 打字练习 - 段落相关
            mods::typing::get_all_passages,
            mods::typing::add_passage,
            mods::typing::add_passages_batch,
            mods::typing::update_passage,
            mods::typing::delete_passage,
            // 百度翻译（划词翻译）
            mods::translate::translate_text,
            mods::translate::translate_config_status,
            // Node子进程
            mods::node_server::get_server_status,
            mods::node_server::start_server,
            mods::node_server::stop_server,
            // Windows Audio
            mods::win_audio_control::get_all_audio_sessions_cmd,
            mods::win_audio_control::get_system_volume_cmd,
            mods::win_audio_control::set_system_volume_cmd,
            mods::win_audio_control::get_system_mute_cmd,
            mods::win_audio_control::set_system_mute_cmd,
            mods::win_audio_control::set_app_volume_cmd,
            mods::win_audio_control::set_app_mute_cmd,
            mods::win_audio_control::start_system_volume_listener_cmd,
            mods::win_audio_control::stop_system_volume_listener_cmd,
            // printer
            mods::printer::print_text,
            mods::printer::test_connection,
            mods::printer::health_check,
            // p2p_chat
            mods::p2p_chat::p2p_status,
            mods::p2p_chat::send_p2p,
            mods::p2p_chat::stop_p2p,
            mods::p2p_chat::start_p2p,
            // channel 频道模块
            mods::channel::get_channels,
            mods::channel::add_channel,
            mods::channel::update_channel,
            mods::channel::delete_channel,
            mods::channel::add_channel_video,
            mods::channel::update_channel_video,
            mods::channel::delete_channel_video,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}