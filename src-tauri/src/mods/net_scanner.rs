// src-tauri/src/mods/network_scanner.rs
use std::net::{Ipv4Addr};
use std::process::Command;
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::State;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkDevice {
    ip: String,
    mac: Option<String>,
    hostname: Option<String>,
    status: String,
    response_time: Option<u64>,
}

#[derive(Default)]
pub struct ScanState {
    is_scanning: Arc<Mutex<bool>>,
    devices: Arc<Mutex<Vec<NetworkDevice>>>,
}

impl ScanState {
    pub fn new() -> Self {
        Self {
            is_scanning: Arc::new(Mutex::new(false)),
            devices: Arc::new(Mutex::new(Vec::new())),
        }
    }
}

// 获取所有局域网 IP 网段（排除 VPN 和虚拟网卡）
fn get_lan_networks() -> Vec<String> {
    let mut networks = Vec::new();
    
    let output = if cfg!(target_os = "windows") {
        match Command::new("ipconfig").output() {
            Ok(out) => out,
            Err(_) => return networks,  // 出错时返回空 Vec
        }
    } else {
        match Command::new("ip").arg("addr").output() {
            Ok(out) => out,
            Err(_) => return networks,
        }
    };
    
    let output_str = String::from_utf8_lossy(&output.stdout);
    let ip_pattern = match regex::Regex::new(r"(\d{1,3}\.){3}\d{1,3}") {
        Ok(re) => re,
        Err(_) => return networks,
    };
    
    let mut found_ips = Vec::new();
    
    for line in output_str.lines() {
        // 跳过 VPN 和虚拟网卡关键字
        let lower_line = line.to_lowercase();
        if lower_line.contains("vpn") 
            || lower_line.contains("virtual") 
            || lower_line.contains("vmware") 
            || lower_line.contains("virtualbox")
            || lower_line.contains("hyper-v") {
            continue;
        }
        
        // 只查找私有 IP 段
        if line.contains("192.168.") || line.contains("10.") || line.contains("172.") {
            if let Some(ip_match) = ip_pattern.find(line) {
                let ip_str = ip_match.as_str();
                if let Ok(ip) = ip_str.parse::<Ipv4Addr>() {
                    if !ip.is_loopback() && !found_ips.contains(&ip_str.to_string()) {
                        found_ips.push(ip_str.to_string());
                        // 提取网段 (前三个字节)
                        let octets: Vec<&str> = ip_str.split('.').collect();
                        if octets.len() >= 3 {
                            let network = format!("{}.{}.{}.", octets[0], octets[1], octets[2]);
                            if !networks.contains(&network) {
                                networks.push(network);
                            }
                        }
                    }
                }
            }
        }
    }
    
    // 如果没有找到局域网，使用默认
    if networks.is_empty() {
        networks.push("192.168.1.".to_string());
    }
    
    networks
}
// Ping 一个 IP 地址
async fn ping_ip(ip: &str) -> Option<u64> {
    let start = std::time::Instant::now();
    
    let status = if cfg!(target_os = "windows") {
        Command::new("ping")
            .args(["-n", "1", "-w", "500", ip])  // 减少超时到 500ms
            .output()
    } else {
        Command::new("ping")
            .args(["-c", "1", "-W", "1", ip])
            .output()
    };
    
    match status {
        Ok(output) if output.status.success() => {
            Some(start.elapsed().as_millis() as u64)
        }
        _ => None,
    }
}

// 获取主机名
fn get_hostname(ip: &str) -> Option<String> {
    if cfg!(target_os = "windows") {
        Command::new("nslookup")
            .arg(ip)
            .output()
            .ok()
            .and_then(|output| {
                let output_str = String::from_utf8_lossy(&output.stdout);
                output_str
                    .lines()
                    .find(|line| line.contains("Name:"))
                    .map(|line| line.replace("Name:", "").trim().to_string())
            })
    } else {
        Command::new("host")
            .arg(ip)
            .output()
            .ok()
            .and_then(|output| {
                let hostname = String::from_utf8_lossy(&output.stdout);
                let hostname = hostname.trim();
                if hostname.is_empty() || hostname == ip {
                    None
                } else {
                    Some(hostname.to_string())
                }
            })
    }
}

// 获取 MAC 地址
fn get_mac_address(ip: &str) -> Option<String> {
    if cfg!(target_os = "windows") {
        Command::new("arp")
            .args(["-a", ip])
            .output()
            .ok()
            .and_then(|output| {
                let output_str = String::from_utf8_lossy(&output.stdout);
                for line in output_str.lines() {
                    if line.contains(ip) {
                        let parts: Vec<&str> = line.split_whitespace().collect();
                        if parts.len() >= 2 {
                            let mac = parts[1].to_string();
                            if mac.contains('-') && mac.len() >= 17 {
                                return Some(mac);
                            }
                        }
                    }
                }
                None
            })
    } else {
        Command::new("arp")
            .arg("-n")
            .arg(ip)
            .output()
            .ok()
            .and_then(|output| {
                let output_str = String::from_utf8_lossy(&output.stdout);
                for line in output_str.lines() {
                    if line.contains(ip) {
                        if let Some(at_pos) = line.find("at ") {
                            let after_at = &line[at_pos + 3..];
                            let mac_end = after_at.find(' ').unwrap_or(after_at.len());
                            let mac = after_at[..mac_end].to_string();
                            if mac.contains(':') && mac.len() >= 17 {
                                return Some(mac);
                            }
                        }
                    }
                }
                None
            })
    }
}

// Tauri 命令：开始扫描局域网
#[tauri::command]
pub async fn scan_network(state: State<'_, ScanState>) -> Result<Vec<NetworkDevice>, String> {
    let mut is_scanning = state.is_scanning.lock().await;
    
    if *is_scanning {
        return Err("扫描已在进行中".to_string());
    }
    
    *is_scanning = true;
    drop(is_scanning);
    
    // 获取所有局域网网段
    let networks = get_lan_networks();
    
    if networks.is_empty() {
        let mut is_scanning = state.is_scanning.lock().await;
        *is_scanning = false;
        return Err("未找到局域网网段".to_string());
    }
    
    let mut all_devices = Vec::new();
    
    // 扫描每个网段
    for network in networks {
        let mut tasks = vec![];
        let discovered_devices = Arc::new(Mutex::new(Vec::new()));
        
        // 并发扫描 1-254
        for i in 1..=254 {
            let ip = format!("{}{}", network, i);
            let devices_clone = discovered_devices.clone();
            
            tasks.push(tokio::spawn(async move {
                if let Some(response_time) = ping_ip(&ip).await {
                    let device = NetworkDevice {
                        ip: ip.clone(),
                        mac: get_mac_address(&ip),
                        hostname: get_hostname(&ip),
                        status: "online".to_string(),
                        response_time: Some(response_time),
                    };
                    
                    let mut devices = devices_clone.lock().await;
                    devices.push(device);
                }
            }));
        }
        
        // 等待所有扫描任务完成
        for task in tasks {
            let _ = task.await;
        }
        
        let devices = discovered_devices.lock().await;
        all_devices.extend(devices.clone());
    }
    
    // 更新状态
    let mut is_scanning = state.is_scanning.lock().await;
    *is_scanning = false;
    let mut state_devices = state.devices.lock().await;
    *state_devices = all_devices.clone();
    
    Ok(all_devices)
}

#[tauri::command]
pub async fn get_scan_status(state: State<'_, ScanState>) -> Result<bool, String> {
    let is_scanning = state.is_scanning.lock().await;
    Ok(*is_scanning)
}

#[tauri::command]
pub async fn get_scanned_devices(state: State<'_, ScanState>) -> Result<Vec<NetworkDevice>, String> {
    let devices = state.devices.lock().await;
    Ok(devices.clone())
}