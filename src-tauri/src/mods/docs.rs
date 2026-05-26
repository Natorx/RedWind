// src/mods/docs.rs
/// 读取文档内容（支持 .md .txt .html .json 等 UTF-8 文本格式）
#[tauri::command(rename_all = "camelCase")]
pub async fn read_document(input_bytes: Vec<u8>) -> Result<String, String> {
    // 尝试 UTF-8 解码，失败时使用 lossy 版本保证始终返回内容
    let content = String::from_utf8(input_bytes)
        .unwrap_or_else(|e| String::from_utf8_lossy(&e.into_bytes()).to_string());
    Ok(content)
}


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


#[tauri::command]
pub fn list_markdown_files() -> Result<Vec<String>, String> {
    let current_dir = std::env::current_dir().map_err(|e| e.to_string())?;

    // 定义候选目录（按优先级排列）
    let candidates = [
        current_dir.join("docs"),                       // 项目根下的 docs/
        current_dir.join("src-tauri").join("docs"),     // 嵌套一次 src-tauri/docs
        // 如果你还有别的位置，可以继续添加
    ];

    // 找到第一个存在的目录
    for docs_dir in candidates.iter() {
        if docs_dir.is_dir() {
            println!("📁 使用文档目录: {:?}", docs_dir);  // 调试时可以看到
            let mut files = Vec::new();
            for entry in std::fs::read_dir(docs_dir).map_err(|e| e.to_string())? {
                let entry = entry.map_err(|e| e.to_string())?;
                let path = entry.path();
                if path.extension().and_then(|ext| ext.to_str()) == Some("md") {
                    files.push(path.to_string_lossy().to_string());
                }
            }
            return Ok(files);
        }
    }

    // 如果都不存在，返回空列表
    Ok(Vec::new())
}


#[tauri::command]
pub fn read_markdown_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path)
        .map_err(|e| format!("读取文件失败: {}", e))
}

#[tauri::command]
pub fn copy_file_to_docs(source_path: String) -> Result<String, String> {
    let current_dir = std::env::current_dir().map_err(|e| e.to_string())?;
    
    // 与 list_markdown_files 相同的候选目录逻辑
    let candidates = [
        current_dir.join("docs"),
        current_dir.join("src-tauri").join("docs"),
    ];

    // 找到第一个存在的目录，若都不存在则创建项目根下的 docs
    let docs_dir = candidates.iter().find(|d| d.is_dir())
        .cloned()
        .unwrap_or_else(|| {
            let default = current_dir.join("docs");
            let _ = std::fs::create_dir_all(&default);
            default
        });

    let source = std::path::Path::new(&source_path);
    let file_name = source.file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "无法从路径中提取文件名".to_string())?;
    
    let dest_path = docs_dir.join(file_name);

    // 复制文件，如果目标已存在则覆盖
    std::fs::copy(source, &dest_path)
        .map_err(|e| format!("复制文件失败: {}", e))?;

    Ok(dest_path.to_string_lossy().to_string())
}
