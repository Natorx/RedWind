/* src/module/hardinfo.rs
description:获取硬件信息*/ 
use sysinfo::{System, Cpu, Disks, Networks, Components};
use std::sync::Mutex;
use tauri::State;
use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct HardwareInfo {
    // 原有字段
    pub cpu_name: String,
    pub cpu_cores: usize,
    pub cpu_usage: f32,
    pub cpu_frequency: u64,
    pub memory_total: u64,
    pub memory_used: u64,
    pub memory_free: u64,
    
    // 新增系统信息
    pub system_name: Option<String>,
    pub system_kernel: Option<String>,
    pub system_os_version: Option<String>,
    pub host_name: Option<String>,
    
    // 新增 swap 信息
    pub swap_total: u64,
    pub swap_used: u64,
    
    // 新增磁盘信息
    pub disks: Vec<DiskInfo>,
    
    // 新增网络信息
    pub networks: Vec<NetworkInfo>,
    
    // 新增组件温度
    pub components: Vec<ComponentInfo>,
}

#[derive(Serialize, Clone)]
pub struct DiskInfo {
    pub name: String,
    pub mount_point: String,
    pub total_space: u64,
    pub available_space: u64,
    pub is_removable: bool,
}

#[derive(Serialize, Clone)]
pub struct NetworkInfo {
    pub name: String,
    pub total_received: u64,
    pub total_transmitted: u64,
}

#[derive(Serialize, Clone)]
pub struct ComponentInfo {
    pub label: String,
    pub temperature: Option<f32>,
    pub max_temperature: Option<f32>,
}

pub struct AppState {
    pub sys: Mutex<System>,
}

#[tauri::command]
pub fn get_hardware_info(state: State<AppState>) -> HardwareInfo {
    let mut sys = state.sys.lock().unwrap();
    sys.refresh_all();
    
    // CPU 信息（原有逻辑）
    let cpus: &[Cpu] = sys.cpus();
    let cpu_info = if let Some(cpu) = cpus.first() {
        (
            cpu.name().to_string(),
            cpus.len(),
            cpus.iter().map(|c| c.cpu_usage()).sum::<f32>() / cpus.len() as f32,
            cpu.frequency(),
        )
    } else {
        ("Unknown".to_string(), 0, 0.0, 0)
    };
    
    // 获取磁盘信息
    let disks = Disks::new_with_refreshed_list();
    let disk_list: Vec<DiskInfo> = disks.iter()
        .map(|disk| DiskInfo {
            name: disk.name().to_string_lossy().to_string(),
            mount_point: disk.mount_point().to_string_lossy().to_string(),
            total_space: disk.total_space(),
            available_space: disk.available_space(),
            is_removable: disk.is_removable(),
        })
        .collect();
    
    // 获取网络信息
    let networks = Networks::new_with_refreshed_list();
    let network_list: Vec<NetworkInfo> = networks.iter()
        .map(|(name, data)| NetworkInfo {
            name: name.clone(),
            total_received: data.total_received(),
            total_transmitted: data.total_transmitted(),
        })
        .collect();
    
    // 获取组件温度信息
    let components = Components::new_with_refreshed_list();
    let component_list: Vec<ComponentInfo> = components.iter()
        .map(|component| ComponentInfo {
            label: component.label().to_string(),
            temperature: component.temperature(),
            max_temperature: component.max(),
        })
        .collect();
    
    HardwareInfo {
        // 原有字段
        cpu_name: cpu_info.0,
        cpu_cores: cpu_info.1,
        cpu_usage: cpu_info.2,
        cpu_frequency: cpu_info.3,
        memory_total: sys.total_memory(),
        memory_used: sys.used_memory(),
        memory_free: sys.free_memory(),
        
        // 新增系统信息
        system_name: System::name(),
        system_kernel: System::kernel_version(),
        system_os_version: System::os_version(),
        host_name: System::host_name(),
        
        // swap 信息
        swap_total: sys.total_swap(),
        swap_used: sys.used_swap(),
        
        // 新增列表
        disks: disk_list,
        networks: network_list,
        components: component_list,
    }
}