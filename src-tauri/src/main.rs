// src-tauri/src/main.rs
use std::process::Command;
use encoding_rs::GBK;

// 跨平台执行shell命令
#[tauri::command]
async fn execute_shell(cmd: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    let (shell, arg) = ("cmd", "/C");
    #[cfg(target_os = "macos")]
    let (shell, arg) = ("bash", "-c");
    #[cfg(target_os = "linux")]
    let (shell, arg) = ("bash", "-c");
    
    let output = Command::new(shell)
        .args([arg, &cmd])
        .output()
        .map_err(|e| format!("命令执行失败: {}", e))?;
    
    // Windows 特殊处理
    #[cfg(target_os = "windows")]
    let decode_output = |bytes: &[u8]| {
        let (cow, _, had_errors) = GBK.decode(bytes);
        if had_errors {
            String::from_utf8_lossy(bytes).to_string()
        } else {
            cow.to_string()
        }
    };
    
    // 其他系统使用 UTF-8
    #[cfg(not(target_os = "windows"))]
    let decode_output = |bytes: &[u8]| {
        String::from_utf8_lossy(bytes).to_string()
    };
    
    if output.status.success() {
        let stdout = decode_output(&output.stdout);
        Ok(stdout.trim().to_string())
    } else {
        let stderr = decode_output(&output.stderr);
        Err(format!("命令执行错误: {}", stderr.trim()))
    }
}

// Windows命令
#[tauri::command]
async fn execute_windows_command(cmd: String) -> Result<String, String> {
    let output = Command::new("cmd")
        .args(["/C", &cmd])
        .output()
        .map_err(|e| format!("命令执行失败: {}", e))?;
    
    let decode_output = |bytes: &[u8]| {
        let (cow, _, had_errors) = GBK.decode(bytes);
        if had_errors {
            String::from_utf8_lossy(bytes).to_string()
        } else {
            cow.to_string()
        }
    };
    
    if output.status.success() {
        let stdout = decode_output(&output.stdout);
        Ok(stdout.trim().to_string())
    } else {
        let stderr = decode_output(&output.stderr);
        Err(format!("命令执行错误: {}", stderr.trim()))
    }
}

// 获取当前工作目录
#[tauri::command]
async fn get_current_dir() -> Result<String, String> {
    #[cfg(not(target_os = "windows"))]
    let cmd = "pwd";
    
    let output = Command::new("cmd")
        .args(["/C", "cd"])
        .output()
        .map_err(|e| format!("获取目录失败: {}", e))?;
    
    let decode_output = |bytes: &[u8]| {
        let (cow, _, had_errors) = GBK.decode(bytes);
        if had_errors {
            String::from_utf8_lossy(bytes).to_string()
        } else {
            cow.to_string()
        }
    };
    
    if output.status.success() {
        let stdout = decode_output(&output.stdout);
        Ok(stdout.trim().to_string())
    } else {
        Err("无法获取当前目录".to_string())
    }
}

// 切换目录
#[tauri::command]
async fn change_dir(path: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    let cmd = format!("cd /d \"{}\" && cd", path);
    #[cfg(not(target_os = "windows"))]
    let cmd = format!("cd \"{}\" && pwd", path);
    
    let output = Command::new("cmd")
        .args(["/C", &cmd])
        .output()
        .map_err(|e| format!("切换目录失败: {}", e))?;
    
    let decode_output = |bytes: &[u8]| {
        let (cow, _, had_errors) = GBK.decode(bytes);
        if had_errors {
            String::from_utf8_lossy(bytes).to_string()
        } else {
            cow.to_string()
        }
    };
    
    if output.status.success() {
        let stdout = decode_output(&output.stdout);
        Ok(stdout.trim().to_string())
    } else {
        let stderr = decode_output(&output.stderr);
        Err(format!("切换目录错误: {}", stderr.trim()))
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            execute_shell,
            execute_windows_command,
            get_current_dir,
            change_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
