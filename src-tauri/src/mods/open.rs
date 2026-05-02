#[tauri::command]
pub fn open_path(path: String) -> Result<(), String> {
    opener::open(&path).map_err(|e| e.to_string())?;
    Ok(())
}
