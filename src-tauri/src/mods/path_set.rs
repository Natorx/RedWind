/* @Edit time: 2025.5.25
@Desc: edit save path for database
*/

use std::path::PathBuf;
use crate::mods::typing;

pub fn get_dev_data_dir() -> Result<PathBuf, Box<dyn std::error::Error>> {
    let mut dir = std::env::current_exe()?;
    dir.pop(); // 移除可执行文件名，得到上级目录（通常是 target/debug/）
    dir.push("data");
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}

pub fn get_prod_data_dir_typing() -> PathBuf {
    let dir = typing::get_app_data_dir();
    std::fs::create_dir_all(&dir).expect("Failed to create app data dir");
    dir
}

pub fn get_prod_data_dir_sidebar() -> PathBuf {
    std::env::temp_dir()
}
