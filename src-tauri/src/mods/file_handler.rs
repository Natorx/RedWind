use std::fs::write;

#[tauri::command]
pub fn export_json(content: String, default_name: String) -> Result<(), String> {
    let file = rfd::FileDialog::new()
        .set_file_name(&default_name)
        .add_filter("JSON", &["json"])
        .save_file();

    match file {
        Some(path) => write(&path, &content).map_err(|e| e.to_string()),
        None => Ok(()), // 用户取消，不报错
    }
}

#[tauri::command]
pub fn save_file_bytes(data: Vec<u8>, default_name: String) -> Result<(), String> {
    let file = rfd::FileDialog::new()
        .set_file_name(&default_name)
        .add_filter("Excel", &["xlsx"])
        .save_file();

    match file {
        Some(path) => std::fs::write(&path, &data).map_err(|e| e.to_string()),
        None => Ok(()),
    }
}
