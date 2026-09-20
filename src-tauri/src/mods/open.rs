#[tauri::command]
pub fn open_path(path: String) -> Result<(), String> {
    opener::open(&path).map_err(|e| e.to_string())?;
    Ok(())
}

/// 用系统默认浏览器打开 URL。
///
/// 前端在 Tauri 里不能用 `<a target="_blank">` 打开外链：
/// WebView 会拦截或静默失败，必须经由后端转发给系统 ShellExecute。
///
/// 这里只放行 http / https 协议，避免前端把 `file:` 或
/// 自定义协议传进来造成意外的本地执行。
#[tauri::command]
pub fn open_url(url: String) -> Result<(), String> {
    let trimmed = url.trim();

    if trimmed.is_empty() {
        return Err("URL 为空".to_string());
    }

    let lower = trimmed.to_ascii_lowercase();
    if !lower.starts_with("http://") && !lower.starts_with("https://") {
        return Err(format!("不支持的链接协议：{}", trimmed));
    }

    opener::open(trimmed).map_err(|e| e.to_string())?;
    Ok(())
}
