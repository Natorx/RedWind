//! 串口链路独立验证工具（与 serial.rs 使用同一 serialport 4.10.1 解码路径）
//! 用法: serial_probe <PORT> <BAUD> <SECONDS>
use std::io::Read;
use std::time::{Duration, Instant};

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let port_name = args.get(1).cloned().unwrap_or_else(|| "COM4".to_string());
    let baud: u32 = args.get(2).and_then(|s| s.parse().ok()).unwrap_or(115200);
    let secs: u64 = args.get(3).and_then(|s| s.parse().ok()).unwrap_or(5);

    println!("[probe] 正在打开 {port_name} @ {baud} ...");

    // 与 serial.rs 完全一致的构造参数
    let mut port = match serialport::new(&port_name, baud)
        .data_bits(serialport::DataBits::Eight)
        .parity(serialport::Parity::None)
        .stop_bits(serialport::StopBits::One)
        .timeout(Duration::from_millis(100))
        .open()
    {
        Ok(p) => {
            println!("[probe] 打开成功");
            p
        }
        Err(e) => {
            println!("[probe] 打开失败: {e}");
            std::process::exit(1);
        }
    };

    let deadline = Instant::now() + Duration::from_secs(secs);
    let mut buf = [0u8; 1024];
    let mut total = 0usize;
    let mut frame = 0usize;

    println!("[probe] 读取 {secs} 秒 ...");
    while Instant::now() < deadline {
        match port.read(&mut buf) {
            Ok(0) => {}
            Ok(n) => {
                total += n;
                frame += 1;
                let text = match std::str::from_utf8(&buf[..n]) {
                    Ok(s) => s.to_string(),
                    Err(_) => String::from_utf8_lossy(&buf[..n]).to_string(),
                };
                println!("[probe] RX#{frame} ({n}B): {:?}", text);
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => {}
            Err(e) => {
                println!("[probe] 读取错误: {e}");
                break;
            }
        }
    }

    println!("[probe] 结束：共收到 {total} 字节 / {frame} 帧");
    if total == 0 {
        println!("[probe] 注意：无数据。ESP32 可能未在输出，可尝试复位板子或检查波特率。");
    }
}
