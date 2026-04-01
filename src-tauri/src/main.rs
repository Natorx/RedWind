// src-tauri/src/main.rs
use std::process::Command;
use encoding_rs::GBK;

// 解码工具函数（消除重复代码）
fn decode_output(bytes: &[u8]) -> String {
    #[cfg(target_os = "windows")]
    {
        let (cow, _, had_errors) = GBK.decode(bytes);
        if had_errors {
            String::from_utf8_lossy(bytes).to_string()
        } else {
            cow.to_string()
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        String::from_utf8_lossy(bytes).to_string()
    }
}

// 执行命令通用函数
fn execute_command(shell: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new(shell)
        .args(args)
        .output()
        .map_err(|e| format!("命令执行失败: {}", e))?;
    
    if output.status.success() {
        let stdout = decode_output(&output.stdout);
        Ok(stdout.trim().to_string())
    } else {
        let stderr = decode_output(&output.stderr);
        Err(format!("命令执行错误: {}", stderr.trim()))
    }
}

// 跨平台执行shell命令
#[tauri::command]
async fn execute_shell(cmd: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    let (shell, arg) = ("cmd", "/C");
    #[cfg(not(target_os = "windows"))]
    let (shell, arg) = ("bash", "-c");
    
    execute_command(shell, &[arg, &cmd])
}

// 获取当前工作目录
#[tauri::command]
async fn get_current_dir() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    let (shell, cmd) = ("cmd", "cd");
    #[cfg(not(target_os = "windows"))]
    let (shell, cmd) = ("bash", "pwd");
    
    execute_command(shell, &["-c", cmd])
}

// 切换目录
#[tauri::command]
async fn change_dir(path: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    let cmd = format!("cd /d \"{}\" && cd", path);
    #[cfg(not(target_os = "windows"))]
    let cmd = format!("cd \"{}\" && pwd", path);
    
    execute_shell(cmd).await
}

// DrillGround
#[tauri::command]
async fn get_poem() -> Result<String, String> {
    // 模拟异步操作，比如从文件或网络获取
    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    
    let poem = r#"
    春江潮水连海平，海上明月共潮生。
    滟滟随波千万里，何处春江无月明！
    "#.trim().to_string();
    
    Ok(poem)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            execute_shell,
            get_current_dir,
            change_dir,
            get_poem
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
