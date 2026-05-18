/// 将 Markdown 内容保存到当前目录下的 docs/ 文件夹
/// content: 完整的 Markdown 字符串
/// date: 日期字符串，用于文件名（如 "2025-03-19"）
/// 返回成功时返回保存的完整路径
#[tauri::command]
pub fn export_markdown(content: String, date: String) -> Result<String, String> {
    // 根据操作系统选择保存位置
    let file_path = if cfg!(target_os = "windows") {
        // Windows: 保存到桌面（直接使用环境变量 USERPROFILE 获取用户目录，再拼接 Desktop）
        let user_profile = std::env::var("USERPROFILE")
            .map_err(|_| "无法获取用户目录（USERPROFILE）".to_string())?;
        let desktop_path = std::path::Path::new(&user_profile).join("Desktop");
        // 文件名：日期.md
        let filename = format!("{}.md", date);
        desktop_path.join(filename)
    } else {
        // 非 Windows 系统：保持原有行为，保存到当前目录下的 docs/ 文件夹
        let current_dir = std::env::current_dir()
            .map_err(|e| format!("获取当前目录失败: {}", e))?;
        let docs_dir = current_dir.join("docs");
        std::fs::create_dir_all(&docs_dir)
            .map_err(|e| format!("创建 docs 目录失败: {}", e))?;
        let filename = format!("{}.md", date);
        docs_dir.join(filename)
    };

    // 写入文件
    std::fs::write(&file_path, &content)
        .map_err(|e| format!("写入文件失败: {}", e))?;

    // 返回文件路径
    Ok(file_path.to_string_lossy().to_string())
}
