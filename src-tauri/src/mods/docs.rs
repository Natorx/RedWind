// src/mods/docs.rs
/// 读取文档内容（支持 .md .txt .html .json 等 UTF-8 文本格式）
#[tauri::command(rename_all = "camelCase")]
pub async fn read_document(
    input_bytes: Vec<u8>,
) -> Result<String, String> {
    // 尝试 UTF-8 解码，失败时使用 lossy 版本保证始终返回内容
    let content = String::from_utf8(input_bytes)
        .unwrap_or_else(|e| String::from_utf8_lossy(&e.into_bytes()).to_string());
    Ok(content)
}
