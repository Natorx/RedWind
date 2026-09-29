//! 串口回环验证：打开 COM4 写入字节，再读回，确认读写链路双向可用。
use std::io::{Read, Write};
use std::time::{Duration, Instant};

fn main() {
    let port_name = std::env::args().nth(1).unwrap_or_else(|| "COM4".to_string());
    let baud: u32 = std::env::args()
        .nth(2)
        .and_then(|s| s.parse().ok())
        .unwrap_or(115200);

    println!("[loop] 打开 {port_name} @ {baud} ...");
    let mut port = match serialport::new(&port_name, baud)
        .data_bits(serialport::DataBits::Eight)
        .parity(serialport::Parity::None)
        .stop_bits(serialport::StopBits::One)
        .timeout(Duration::from_millis(100))
        .open()
    {
        Ok(p) => p,
        Err(e) => {
            println!("[loop] 打开失败: {e}");
            std::process::exit(1);
        }
    };

    // 写测试
    let payload = b"REDWIND_LOOPBACK_TEST\r\n";
    match port.write_all(payload) {
        Ok(_) => println!("[loop] 写入 {} 字节成功: {:?}", payload.len(), String::from_utf8_lossy(payload)),
        Err(e) => {
            println!("[loop] 写入失败: {e}");
            std::process::exit(1);
        }
    }
    let _ = port.flush();

    // 读测试（等 3 秒）
    let deadline = Instant::now() + Duration::from_secs(3);
    let mut buf = [0u8; 512];
    let mut total = 0usize;
    while Instant::now() < deadline {
        match port.read(&mut buf) {
            Ok(0) => {}
            Ok(n) => {
                total += n;
                println!("[loop] 读回 {n} 字节: {:?}", String::from_utf8_lossy(&buf[..n]));
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => {}
            Err(e) => {
                println!("[loop] 读取错误: {e}");
                break;
            }
        }
    }
    println!("[loop] 结果: 写入成功, 读回 {total} 字节");
}
