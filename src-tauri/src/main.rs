use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Tauri.", name)
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path)
        .map_err(|e| format!("读取文件失败: {}", e))
}

#[tauri::command]
fn write_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(&path, contents)
        .map_err(|e| format!("写入文件失败: {}", e))
}

#[tauri::command]
fn get_system_info() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    let os_name = "Windows";
    #[cfg(target_os = "macos")]
    let os_name = "macOS";
    #[cfg(target_os = "linux")]
    let os_name = "Linux";
    
    Ok(format!("操作系统: {}", os_name))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            greet,
            read_file,
            write_file,
            get_system_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
