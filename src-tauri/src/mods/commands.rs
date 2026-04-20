use encoding_rs::GBK;
use std::process::Command;

pub fn decode_output(bytes: &[u8]) -> String {
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
pub fn execute_command(shell: &str, args: &[&str]) -> Result<String, String> {
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
pub async fn execute_shell(cmd: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    let (shell, arg) = ("cmd", "/C");
    #[cfg(not(target_os = "windows"))]
    let (shell, arg) = ("bash", "-c");

    execute_command(shell, &[arg, &cmd])
}

// 获取当前工作目录
#[tauri::command]
pub async fn get_current_dir() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    let (shell, cmd) = ("cmd", "cd");
    #[cfg(not(target_os = "windows"))]
    let (shell, cmd) = ("bash", "pwd");

    execute_command(shell, &["-c", cmd])
}

// 切换目录
#[tauri::command]
pub async fn change_dir(path: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    let cmd = format!("cd /d \"{}\" && cd", path);
    #[cfg(not(target_os = "windows"))]
    let cmd = format!("cd \"{}\" && pwd", path);

    execute_shell(cmd).await
}
