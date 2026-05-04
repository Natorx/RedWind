// src-tauri/src/printer_service.rs
use serde::{Serialize, Deserialize};
use tauri::command;
use std::net::TcpStream;
use std::io::{Write};
use std::time::Duration;
use encoding::{Encoding,EncoderTrap};
use encoding::all::GB18030;

#[derive(Debug, Serialize, Deserialize)]
pub struct PrintOptions {
    text: String,
    ip: Option<String>,
    port: Option<u16>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PrintResult {
    success: bool,
    message: String,
    preview: Option<String>,
    error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TestConnectionOptions {
    ip: Option<String>,
    port: Option<u16>,
}

const DEFAULT_IP: &str = "192.168.101.8";
const DEFAULT_PORT: u16 = 9100;
const TIMEOUT_MS: u64 = 3000;

// 打印命令
#[command]
pub async fn print_text(options: PrintOptions) -> Result<PrintResult, String> {
    let text = options.text.trim();
    if text.is_empty() {
        return Ok(PrintResult {
            success: false,
            message: "请输入要打印的文本内容".to_string(),
            preview: None,
            error: None,
        });
    }

    let ip = options.ip.unwrap_or_else(|| DEFAULT_IP.to_string());
    let port = options.port.unwrap_or(DEFAULT_PORT);
    
    println!("收到打印请求: {}...", &text[..text.len().min(50)]);

    match print_gb18030(&text, &ip, port).await {
        Ok(preview) => Ok(PrintResult {
            success: true,
            message: format!("打印成功: {}...", &text[..text.len().min(50)]),
            preview: Some(preview),
            error: None,
        }),
        Err(e) => Ok(PrintResult {
            success: false,
            message: "打印失败".to_string(),
            preview: None,
            error: Some(e),
        }),
    }
}

// 测试连接命令
#[command]
pub async fn test_connection(options: TestConnectionOptions) -> Result<serde_json::Value, String> {
    let ip = options.ip.unwrap_or_else(|| DEFAULT_IP.to_string());
    let port = options.port.unwrap_or(DEFAULT_PORT);
    
    println!("测试打印机连接: {}:{}", ip, port);
    
    let is_connected = test_printer_connection(&ip, port).await;
    
    Ok(serde_json::json!({
        "success": is_connected,
        "message": if is_connected { "打印机连接正常" } else { "无法连接到打印机" },
        "ip": ip,
        "port": port,
    }))
}

// 健康检查命令
#[command]
pub async fn health_check() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "status": "ok",
        "service": "printer-service",
        "timestamp": chrono::Utc::now().to_rfc3339(),
    }))
}

// 核心打印函数
async fn print_gb18030(text: &str, ip: &str, port: u16) -> Result<String, String> {
    // 将文本编码为 GB18030
    let gb_buffer = GB18030.encode(text, EncoderTrap::Strict)
        .map_err(|e| format!("编码失败: {:?}", e))?;
    
    // 连接 TCP
    let addr = format!("{}:{}", ip, port);
    let stream = TcpStream::connect_timeout(
        &addr.parse().map_err(|e| format!("地址解析失败: {}", e))?,
        Duration::from_millis(TIMEOUT_MS)
    ).map_err(|e| format!("连接失败: {}", e))?;
    
    stream.set_write_timeout(Some(Duration::from_millis(TIMEOUT_MS)))
        .map_err(|e| format!("设置超时失败: {}", e))?;
    stream.set_read_timeout(Some(Duration::from_millis(TIMEOUT_MS)))
        .map_err(|e| format!("设置超时失败: {}", e))?;
    
    let mut writer = stream;
    
    println!("连接打印机成功 {}:{}", ip, port);
    
    // 1. 初始化打印机
    writer.write_all(&[0x1B, 0x40])
        .map_err(|e| format!("初始化命令发送失败: {}", e))?;
    
    // 2. 设置 GB18030 编码（如果打印机支持）
    writer.write_all(&[0x1B, 0x74, 0x17])
        .map_err(|e| format!("编码设置命令发送失败: {}", e))?;
    
    // 3. 发送中文文本
    writer.write_all(&gb_buffer)
        .map_err(|e| format!("文本发送失败: {}", e))?;
    writer.write_all(b"\n\n\n")
        .map_err(|e| format!("换行符发送失败: {}", e))?;
    
    // 4. 切纸（可选，根据打印机型号调整）
    writer.write_all(&[0x1D, 0x56, 0x41, 0x00])
        .map_err(|e| format!("切纸命令发送失败: {}", e))?;
    
    writer.flush().map_err(|e| format!("刷新缓冲区失败: {}", e))?;
    
    println!("打印任务完成: {}...", &text[..text.len().min(50)]);
    
    Ok(text.chars().take(50).collect::<String>() + if text.len() > 50 { "..." } else { "" })
}

// 测试连接函数
async fn test_printer_connection(ip: &str, port: u16) -> bool {
    let addr = format!("{}:{}", ip, port);
    
    // 方式1：使用 match 处理 Result
    let addr_parsed = match addr.parse() {
        Ok(addr) => addr,
        Err(_) => return false,  // 解析失败直接返回 false
    };
    
    match TcpStream::connect_timeout(&addr_parsed, Duration::from_millis(2000)) {
        Ok(stream) => {
            drop(stream);
            true
        }
        Err(_) => false
    }
}