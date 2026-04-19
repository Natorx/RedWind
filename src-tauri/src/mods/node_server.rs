// src/mods/node_server.rs
use std::process::{Command, Child};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use std::path::PathBuf;

#[derive(Default)]
pub struct ServerState {
    pub process: Mutex<Option<Child>>,
}

#[tauri::command]
pub async fn start_server(
    state: tauri::State<'_, ServerState>,
    app_handle: AppHandle,
) -> Result<String, String> {
    let mut server_process = state.process.lock().unwrap();
    
    if let Some(child) = server_process.as_mut() {
        if child.try_wait().is_err() {
            return Err("Server is already running".to_string());
        }
    }
    
    // 获取项目路径
    let resource_dir = app_handle.path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource dir: {}", e))?;
    
    let workspace_root = match resource_dir.parent() {
        Some(p1) => match p1.parent() {
            Some(p2) => match p2.parent() {
                Some(p3) => p3,
                None => return Err("Failed to find workspace root".to_string()),
            },
            None => return Err("Failed to find workspace root".to_string()),
        },
        None => return Err("Failed to find workspace root".to_string()),
    };
    
    let server_path = workspace_root.join("server");
    
    if !server_path.exists() {
        return Err(format!("Server directory not found: {:?}", server_path));
    }
    
    // Windows 使用 cmd，其他系统直接使用 npm
    #[cfg(target_os = "windows")]
    let child = Command::new("cmd")
        .args(&["/C", "npm", "run", "dev_server"])
        .current_dir(&server_path)
        .spawn()
        .map_err(|e| format!("Failed to start server: {}", e))?;
    
    #[cfg(not(target_os = "windows"))]
    let child = Command::new("npm")
        .arg("run")
        .arg("dev_server")
        .current_dir(&server_path)
        .spawn()
        .map_err(|e| format!("Failed to start server: {}", e))?;
    
    *server_process = Some(child);
    Ok("Server started successfully".to_string())
}

#[tauri::command]
pub async fn stop_server(
    state: tauri::State<'_, ServerState>,
) -> Result<String, String> {
    let mut server_process = state.process.lock().unwrap();
    
    if let Some(mut child) = server_process.take() {
        match child.kill() {
            Ok(_) => {
                let _ = child.wait();
                Ok("Server stopped successfully".to_string())
            },
            Err(e) => Err(format!("Failed to stop server: {}", e)),
        }
    } else {
        Err("No server is running".to_string())
    }
}

#[tauri::command]
pub async fn get_server_status(
    state: tauri::State<'_, ServerState>,
) -> Result<bool, String> {
    let mut server_process = state.process.lock().unwrap();
    
    match server_process.as_mut() {
        Some(child) => {
            Ok(child.try_wait().is_err())
        },
        None => Ok(false),
    }
}