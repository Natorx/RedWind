// src/mods/config.rs
use serde::{Serialize, Deserialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub active_ui: String, // "circle" 或 "sidebar"
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            active_ui: "sidebar".to_string(),
        }
    }
}

pub struct ConfigManager {
    config_path: PathBuf,
}

impl ConfigManager {
    pub fn new(app_handle: &tauri::AppHandle) -> Self {
        let config_path = app_handle
            .path()
            .app_config_dir()
            .expect("Failed to get config dir")
            .join("config.json");
        
        // 确保目录存在
        if let Some(parent) = config_path.parent() {
            fs::create_dir_all(parent).unwrap_or_default();
        }
        
        Self { config_path }
    }
    
    // 加载配置
    pub fn load(&self) -> AppConfig {
        fs::read_to_string(&self.config_path)
            .ok()
            .and_then(|content| serde_json::from_str(&content).ok())
            .unwrap_or_default()
    }
    
    // 保存配置
    pub fn save(&self, config: &AppConfig) -> Result<(), String> {
        let content = serde_json::to_string_pretty(config)
            .map_err(|e| e.to_string())?;
        fs::write(&self.config_path, content)
            .map_err(|e| e.to_string())
    }
    
    // 切换 UI
    pub fn set_active_ui(&self, active_ui: String) -> Result<(), String> {
        let mut config = self.load();
        config.active_ui = active_ui;
        self.save(&config)
    }
    
    // 获取当前激活的 UI
    pub fn get_active_ui(&self) -> String {
        self.load().active_ui
    }
}

// Tauri 命令
#[tauri::command]
pub fn get_active_ui(state: tauri::State<ConfigManager>) -> Result<String, String> {
    Ok(state.get_active_ui())
}

#[tauri::command]
pub fn set_active_ui(state: tauri::State<ConfigManager>, active_ui: String) -> Result<(), String> {
    state.set_active_ui(active_ui)
}