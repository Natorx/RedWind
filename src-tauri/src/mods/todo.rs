use std::fs;

/// 将 Markdown 内容保存到当前目录下的 docs/ 文件夹
/// content: 完整的 Markdown 字符串
/// date: 日期字符串，用于文件名（如 "2025-03-19"）
/// 返回成功时返回保存的完整路径
#[tauri::command]
pub fn export_markdown(content: String, date: String) -> Result<String, String> {
    // 获取当前工作目录
    let current_dir = std::env::current_dir().map_err(|e| format!("获取当前目录失败: {}", e))?;
    // 构建 docs 目录路径
    let docs_dir = current_dir.join("docs");
    // 创建 docs 目录（如果不存在）
    fs::create_dir_all(&docs_dir).map_err(|e| format!("创建 docs 目录失败: {}", e))?;
    // 文件名：日期.md
    let filename = format!("{}.md", date);
    let file_path = docs_dir.join(&filename);
    // 写入文件
    fs::write(&file_path, &content).map_err(|e| format!("写入文件失败: {}", e))?;
    // 返回成功路径（可选）
    Ok(file_path.to_string_lossy().to_string())
}
