use image::ImageReader;
use std::io::Cursor;

// 图片格式转换命令（目前只支持常见图片格式）
#[tauri::command]
pub async fn convert_file(
    input_bytes: Vec<u8>,
    from_format: String,
    to_format: String,
    _original_name: String, // 暂时没用到，可保留
) -> Result<Vec<u8>, String> {
    // 1. 读取输入图像
    let img = ImageReader::new(Cursor::new(input_bytes))
        .with_guessed_format()
        .map_err(|e| format!("读取图像失败: {}", e))?
        .decode()
        .map_err(|e| format!("解码图像失败: {}", e))?;

    // 2. 根据目标格式编码
    let mut output_bytes = Vec::new();

    match to_format.to_lowercase().as_str() {
        "png" => {
            img.write_to(&mut Cursor::new(&mut output_bytes), image::ImageFormat::Png)
                .map_err(|e| format!("转换为 PNG 失败: {}", e))?;
        }
        "jpg" | "jpeg" => {
            img.write_to(
                &mut Cursor::new(&mut output_bytes),
                image::ImageFormat::Jpeg,
            )
            .map_err(|e| format!("转换为 JPG 失败: {}", e))?;
        }
        "webp" => {
            img.write_to(
                &mut Cursor::new(&mut output_bytes),
                image::ImageFormat::WebP,
            )
            .map_err(|e| format!("转换为 WebP 失败: {}", e))?;
        }
        _ => {
            return Err(format!("不支持的目标格式: {}", to_format));
        }
    }

    Ok(output_bytes)
}
