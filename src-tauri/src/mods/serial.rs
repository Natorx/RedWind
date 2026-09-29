// src-tauri/src/mods/serial.rs
/**
 * @Author: Fofow
 * @Date: 2026/9/30
 * @Description: 单片机调试 - ESP32 串口连接与日志查看
 * @Copyright: Copyright (©) 2026 Fofow. All rights reserved.
 *
 * MVP 能力：
 *  - 枚举本机可用串口
 *  - 连接 / 断开指定串口（波特率、数据位、校验、停止位）
 *  - 发送文本到串口
 *  - 后台线程持续读取，日志存入有界环形缓冲，前端轮询拉取
 */
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::io::{Read, Write};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::command;

/// 日志缓冲上限：超出后丢弃最旧记录，防止长时间调试撑爆内存
const MAX_LOG_ENTRIES: usize = 5000;

/// 单次读取的字节上限
const READ_CHUNK: usize = 1024;

// ---------------- 数据结构 ----------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SerialPortInfo {
    /// 端口名，例如 COM4
    pub port_name: String,
    /// 端口类型描述，例如 UsbPort
    pub port_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SerialLine {
    /// 自增序号，前端据此做增量拉取
    pub seq: u64,
    /// unix 毫秒时间戳
    pub ts: u64,
    /// rx = 设备发来；tx = 本机发送；sys = 系统提示
    pub kind: String,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SerialStatus {
    pub connected: bool,
    pub port: Option<String>,
    pub baud_rate: Option<u32>,
    /// 当前缓冲中的最新序号，前端用它做游标
    pub last_seq: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SerialOpenOptions {
    pub port_name: String,
    pub baud_rate: Option<u32>,
    /// 数据位：5 / 6 / 7 / 8，默认 8
    pub data_bits: Option<u8>,
    /// 校验：none / odd / even，默认 none
    pub parity: Option<String>,
    /// 停止位：1 / 2，默认 1
    pub stop_bits: Option<u8>,
}

/// 内部共享状态
pub struct SerialState {
    /// 有界日志环形缓冲
    logs: Arc<Mutex<VecDeque<SerialLine>>>,
    /// 自增序号发生器（Arc 共享给读线程，保证前后端游标一致）
    seq: Arc<AtomicU64>,
    /// 写句柄：连接期间持有，断开时置 None
    writer: Arc<Mutex<Option<Box<dyn serialport::SerialPort>>>>,
    /// 读线程退出标志
    running: Arc<AtomicBool>,
    /// 当前连接信息
    current_port: Arc<Mutex<Option<String>>>,
    current_baud: Arc<Mutex<Option<u32>>>,
}

impl SerialState {
    pub fn new() -> Self {
        Self {
            logs: Arc::new(Mutex::new(VecDeque::with_capacity(MAX_LOG_ENTRIES))),
            seq: Arc::new(AtomicU64::new(0)),
            writer: Arc::new(Mutex::new(None)),
            running: Arc::new(AtomicBool::new(false)),
            current_port: Arc::new(Mutex::new(None)),
            current_baud: Arc::new(Mutex::new(None)),
        }
    }

    /// 追加一条日志，超出容量时淘汰最旧记录
    fn push_log(&self, kind: &str, text: String) {
        let seq = self.seq.fetch_add(1, Ordering::SeqCst) + 1;
        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        let line = SerialLine {
            seq,
            ts,
            kind: kind.to_string(),
            text,
        };
        if let Ok(mut guard) = self.logs.lock() {
            if guard.len() >= MAX_LOG_ENTRIES {
                guard.pop_front();
            }
            guard.push_back(line);
        }
    }

    /// 清空日志（序号继续递增，避免前端游标错乱）
    fn clear_logs(&self) {
        if let Ok(mut guard) = self.logs.lock() {
            guard.clear();
        }
    }
}

impl Default for SerialState {
    fn default() -> Self {
        Self::new()
    }
}

/// 字节流转成可读文本：先按 UTF-8 严格解码，失败则用有损解码（保留中文等）
fn bytes_to_text(buf: &[u8]) -> String {
    match std::str::from_utf8(buf) {
        Ok(s) => s.to_string(),
        Err(_) => String::from_utf8_lossy(buf).to_string(),
    }
}

// ---------------- 命令 ----------------

/// 枚举本机所有串口
#[command]
pub fn serial_list_ports() -> Result<Vec<SerialPortInfo>, String> {
    match serialport::available_ports() {
        Ok(ports) => Ok(ports
            .into_iter()
            .map(|p| SerialPortInfo {
                port_name: p.port_name,
                port_type: format!("{:?}", p.port_type),
            })
            .collect()),
        Err(e) => Err(format!("枚举串口失败: {e}")),
    }
}

/// 连接串口并启动后台读取线程
#[command]
pub fn serial_connect(state: tauri::State<'_, SerialState>, options: SerialOpenOptions) -> Result<SerialStatus, String> {
    // 已连接则先断开，保证状态干净
    if state.running.load(Ordering::SeqCst) {
        let _ = serial_disconnect_impl(&state);
    }

    let baud_rate = options.baud_rate.unwrap_or(115200);
    let data_bits = match options.data_bits.unwrap_or(8) {
        5 => serialport::DataBits::Five,
        6 => serialport::DataBits::Six,
        7 => serialport::DataBits::Seven,
        _ => serialport::DataBits::Eight,
    };
    let parity = match options.parity.as_deref().unwrap_or("none") {
        "odd" => serialport::Parity::Odd,
        "even" => serialport::Parity::Even,
        _ => serialport::Parity::None,
    };
    let stop_bits = match options.stop_bits.unwrap_or(1) {
        2 => serialport::StopBits::Two,
        _ => serialport::StopBits::One,
    };

    let builder = serialport::new(&options.port_name, baud_rate)
        .data_bits(data_bits)
        .parity(parity)
        .stop_bits(stop_bits)
        .timeout(Duration::from_millis(100));

    let port = builder
        .open()
        .map_err(|e| format!("打开串口 {} 失败: {e}", options.port_name))?;

    // 读线程用克隆句柄，写用原句柄
    let mut reader = port
        .try_clone()
        .map_err(|e| format!("复制串口句柄失败: {e}"))?;

    let writer: Box<dyn serialport::SerialPort> = port;

    state
        .push_log("sys", format!("已连接到 {} @ {} bps", options.port_name, baud_rate));

    // 存写句柄
    {
        let mut w = state
            .writer
            .lock()
            .map_err(|_| "串口状态锁被污染".to_string())?;
        *w = Some(writer);
    }
    {
        let mut p = state.current_port.lock().map_err(|_| "串口状态锁被污染".to_string())?;
        *p = Some(options.port_name.clone());
    }
    {
        let mut b = state.current_baud.lock().map_err(|_| "串口状态锁被污染".to_string())?;
        *b = Some(baud_rate);
    }

    state.running.store(true, Ordering::SeqCst);

    // 后台读取线程
    let logs = state.logs.clone();
    let seq_gen = Arc::clone(&state.seq);
    let running = state.running.clone();

    std::thread::spawn(move || {
        let mut buf = [0u8; READ_CHUNK];
        while running.load(Ordering::SeqCst) {
            match reader.read(&mut buf) {
                Ok(0) => continue,
                Ok(n) => {
                    let text = bytes_to_text(&buf[..n]);
                    let seq = seq_gen.fetch_add(1, Ordering::SeqCst) + 1;
                    let ts = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .map(|d| d.as_millis() as u64)
                        .unwrap_or(0);
                    if let Ok(mut guard) = logs.lock() {
                        if guard.len() >= MAX_LOG_ENTRIES {
                            guard.pop_front();
                        }
                        guard.push_back(SerialLine {
                            seq,
                            ts,
                            kind: "rx".to_string(),
                            text,
                        });
                    }
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => continue,
                Err(ref e) if e.kind() == std::io::ErrorKind::Interrupted => continue,
                Err(e) => {
                    let msg = format!("串口读取中断: {e}");
                    let seq = seq_gen.fetch_add(1, Ordering::SeqCst) + 1;
                    let ts = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .map(|d| d.as_millis() as u64)
                        .unwrap_or(0);
                    if let Ok(mut guard) = logs.lock() {
                        if guard.len() >= MAX_LOG_ENTRIES {
                            guard.pop_front();
                        }
                        guard.push_back(SerialLine {
                            seq,
                            ts,
                            kind: "sys".to_string(),
                            text: msg,
                        });
                    }
                    running.store(false, Ordering::SeqCst);
                    break;
                }
            }
        }
    });

    Ok(SerialStatus {
        connected: true,
        port: Some(options.port_name),
        baud_rate: Some(baud_rate),
        last_seq: state.seq.load(Ordering::SeqCst),
    })
}

/// 断开连接（内部实现，供 connect 复用）
fn serial_disconnect_impl(state: &SerialState) -> Result<SerialStatus, String> {
    state.running.store(false, Ordering::SeqCst);

    // 释放句柄，读线程会因句柄关闭而结束
    {
        let mut w = state.writer.lock().map_err(|_| "串口状态锁被污染".to_string())?;
        *w = None;
    }
    let port = state.current_port.lock().map_err(|_| "串口状态锁被污染".to_string())?.clone();
    {
        let mut p = state.current_port.lock().map_err(|_| "串口状态锁被污染".to_string())?;
        *p = None;
    }
    {
        let mut b = state.current_baud.lock().map_err(|_| "串口状态锁被污染".to_string())?;
        *b = None;
    }

    if let Some(name) = port {
        state.push_log("sys", format!("已断开 {name}"));
    }

    Ok(SerialStatus {
        connected: false,
        port: None,
        baud_rate: None,
        last_seq: state.seq.load(Ordering::SeqCst),
    })
}

/// 断开串口
#[command]
pub fn serial_disconnect(state: tauri::State<'_, SerialState>) -> Result<SerialStatus, String> {
    serial_disconnect_impl(&state)
}

/// 当前连接状态
#[command]
pub fn serial_status(state: tauri::State<'_, SerialState>) -> Result<SerialStatus, String> {
    let connected = state.running.load(Ordering::SeqCst)
        && state
            .writer
            .lock()
            .map(|w| w.is_some())
            .unwrap_or(false);
    let port = state.current_port.lock().ok().and_then(|p| p.clone());
    let baud = state.current_baud.lock().ok().and_then(|b| *b);
    Ok(SerialStatus {
        connected,
        port,
        baud_rate: baud,
        last_seq: state.seq.load(Ordering::SeqCst),
    })
}

/// 发送文本到串口
#[command]
pub fn serial_write(state: tauri::State<'_, SerialState>, data: String) -> Result<(), String> {
    let mut guard = state.writer.lock().map_err(|_| "串口状态锁被污染".to_string())?;
    let port = guard.as_mut().ok_or_else(|| "串口未连接".to_string())?;
    port.write_all(data.as_bytes())
        .map_err(|e| format!("发送失败: {e}"))?;
    port.flush().map_err(|e| format!("刷新缓冲失败: {e}"))?;
    drop(guard);

    state.push_log("tx", data);
    Ok(())
}

/// 拉取日志：since_seq 之后的新记录
#[command]
pub fn serial_read_logs(
    state: tauri::State<'_, SerialState>,
    since_seq: u64,
) -> Result<Vec<SerialLine>, String> {
    let guard = state.logs.lock().map_err(|_| "日志缓冲锁被污染".to_string())?;
    let lines: Vec<SerialLine> = guard
        .iter()
        .filter(|l| l.seq > since_seq)
        .cloned()
        .collect();
    Ok(lines)
}

/// 清空日志
#[command]
pub fn serial_clear_logs(state: tauri::State<'_, SerialState>) -> Result<(), String> {
    state.clear_logs();
    Ok(())
}

/// 触发 ESP32 复位：拉低 DTR（EN）再释放，串口会输出启动 banner。
/// 注意：USB-Serial-JTAG 上 DTR/RTS 语义与经典 UART 桥不同，
/// 这里按经典接法（DTR=EN, RTS=BOOT）实现，失败不影响已有连接。
#[command]
pub fn serial_reset(state: tauri::State<'_, SerialState>) -> Result<(), String> {
    let mut guard = state.writer.lock().map_err(|_| "串口状态锁被污染".to_string())?;
    let port = guard.as_mut().ok_or_else(|| "串口未连接".to_string())?;

    // 进入复位序列：DTR=false 拉低 EN 使芯片复位
    port.write_data_terminal_ready(false)
        .map_err(|e| format!("设置 DTR 失败: {e}"))?;
    std::thread::sleep(Duration::from_millis(120));
    // 释放复位
    port.write_data_terminal_ready(true)
        .map_err(|e| format!("释放 DTR 失败: {e}"))?;
    drop(guard);

    state.push_log("sys", "已发送复位信号 (DTR 脉冲)".to_string());
    Ok(())
}

/// 切换 DTR / RTS 引脚电平（调试 ESP32 启动模式用）
#[command]
pub fn serial_set_signals(
    state: tauri::State<'_, SerialState>,
    dtr: bool,
    rts: bool,
) -> Result<(), String> {
    let mut guard = state.writer.lock().map_err(|_| "串口状态锁被污染".to_string())?;
    let port = guard.as_mut().ok_or_else(|| "串口未连接".to_string())?;
    port.write_data_terminal_ready(dtr)
        .map_err(|e| format!("设置 DTR 失败: {e}"))?;
    port.write_request_to_send(rts)
        .map_err(|e| format!("设置 RTS 失败: {e}"))?;
    Ok(())
}
