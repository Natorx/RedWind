/* src/module/hardinfo.rs
description:获取硬件信息*/
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use sysinfo::{Components, Cpu, Disks, Networks, System};
use tauri::State;

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
    let disk_list: Vec<DiskInfo> = disks
        .iter()
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
    let network_list: Vec<NetworkInfo> = networks
        .iter()
        .map(|(name, data)| NetworkInfo {
            name: name.clone(),
            total_received: data.total_received(),
            total_transmitted: data.total_transmitted(),
        })
        .collect();

    // 获取组件温度信息
    let components = Components::new_with_refreshed_list();
    let component_list: Vec<ComponentInfo> = components
        .iter()
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

// ============================================================
// GUI 应用进程管理
// 只管理「有可见窗口的应用」（如抖音、Bilibili、VS Code 等），
// 不再返回系统服务、后台进程等无界面的进程。
// ============================================================

/// 无 GUI 的进程黑名单：Windows 核心进程 / 系统服务 / 宿主进程
const GUI_BLACKLIST: &[&str] = &[
    "system",
    "system idle process",
    "registry",
    "memory compression",
    "secure system",
    "smss.exe",
    "csrss.exe",
    "wininit.exe",
    "winlogon.exe",
    "services.exe",
    "lsass.exe",
    "lsaiso.exe",
    "fontdrvhost.exe",
    "dwm.exe",
    "sihost.exe",
    "taskhostw.exe",
    "ctfmon.exe",
    "conhost.exe",
    "audiodg.exe",
    "spoolsv.exe",
    "svchost.exe",
    "runtimebroker.exe",
    "searchindexer.exe",
    "searchhost.exe",
    "startmenuexperiencehost.exe",
    "shellexperiencehost.exe",
    "textinputhost.exe",
    "wmiprvse.exe",
    "wudfhost.exe",
    "dllhost.exe",
    "backgroundtaskhost.exe",
    "applicationframehost.exe",
    "securityhealthsystray.exe",
    "securityhealthservice.exe",
    "widgets.exe",
    "widgetservice.exe",
    "lockapp.exe",
    "useroobebroker.exe",
    "msmpeng.exe",
    "nissrv.exe",
    "wlanext.exe",
];

/// 明显是服务/无界面程序的后缀，同样排除
const SERVICE_SUFFIXES: &[&str] = &["svc.exe", "service.exe"];

/// 判断是否属于「不管理的无 GUI 进程」
fn is_non_gui(name: &str) -> bool {
    let lower = name.to_lowercase();
    if GUI_BLACKLIST.contains(&lower.as_str()) {
        return true;
    }
    SERVICE_SUFFIXES.iter().any(|s| lower.ends_with(s))
}

/// 取可执行文件所在文件夹名，用于把同一应用的多进程聚成一个「应用名」
/// （Electron 应用如 VS Code / 抖音桌面版会有多个子进程）
fn app_group_key(process: &sysinfo::Process) -> String {
    if let Some(exe) = process.exe() {
        if let Some(parent) = exe.parent() {
            if let Some(folder) = parent.file_name() {
                let folder = folder.to_string_lossy().to_string();
                if !folder.trim().is_empty() {
                    return folder;
                }
            }
        }
    }
    process.name().to_string_lossy().to_string()
}

// ---- 平台相关的「可见顶层窗口」枚举 ----

#[cfg(target_os = "windows")]
mod win_ui {
    use std::collections::{HashMap, HashSet};
    use windows::core::BOOL;
    use windows::Win32::Foundation::{HWND, LPARAM, TRUE};
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetWindowTextLengthW, GetWindowTextW, GetWindowThreadProcessId,
        IsWindowVisible,
    };

    /// 返回 (有可见窗口的 pid 集合, pid -> 窗口标题)
    pub fn visible_windows() -> (HashSet<u32>, HashMap<u32, String>) {
        unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
            unsafe {
                let ctx = &mut *(lparam.0 as *mut (HashSet<u32>, HashMap<u32, String>));

                // 只要可见窗口
                if !IsWindowVisible(hwnd).as_bool() {
                    return TRUE;
                }

                let len = GetWindowTextLengthW(hwnd);
                if len <= 0 {
                    return TRUE;
                }

                let mut buf: Vec<u16> = vec![0u16; (len + 1) as usize];
                let copied = GetWindowTextW(hwnd, &mut buf);
                if copied <= 0 {
                    return TRUE;
                }

                let mut pid: u32 = 0;
                GetWindowThreadProcessId(hwnd, Some(&mut pid));
                if pid == 0 {
                    return TRUE;
                }

                let title = String::from_utf16_lossy(&buf[..copied as usize]);
                let title = title.trim().to_string();
                if title.is_empty() {
                    return TRUE;
                }

                ctx.0.insert(pid);
                ctx.1.entry(pid).or_insert(title);
                TRUE
            }
        }

        let mut ctx: (HashSet<u32>, HashMap<u32, String>) = (HashSet::new(), HashMap::new());
        unsafe {
            let _ = EnumWindows(Some(enum_proc), LPARAM(&mut ctx as *mut _ as isize));
        }
        ctx
    }
}

#[cfg(not(target_os = "windows"))]
mod win_ui {
    use std::collections::{HashMap, HashSet};

    pub fn visible_windows() -> (HashSet<u32>, HashMap<u32, String>) {
        (HashSet::new(), HashMap::new())
    }
}

// 进程调度查看函数
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessInfo {
    pub pid: String,
    pub name: String,
    /// 应用展示名：优先用窗口标题，退回应用名
    pub display_name: String,
    pub cpu_usage: f32,
    pub memory_kb: u64,
    pub total_written_bytes: u64,
    pub written_bytes: u64,
    pub total_read_bytes: u64,
    pub read_bytes: u64,
    /// 是否拥有可见窗口
    pub has_window: bool,
    /// 窗口标题
    pub window_title: String,
}

/// 获取「有 GUI 的应用」进程列表（只返回拥有可见窗口的进程）
#[tauri::command]
pub fn get_process() -> Vec<ProcessInfo> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let (window_pids, titles) = win_ui::visible_windows();

    let mut processes = Vec::new();

    for (pid, process) in sys.processes() {
        let pid_u32 = pid.as_u32();
        let name = process.name().to_string_lossy().to_string();

        // 先按黑名单排除系统/后台进程
        if is_non_gui(&name) {
            continue;
        }

        // 只保留拥有可见窗口的进程 —— 这就是「GUI 应用」的判据
        if !window_pids.contains(&pid_u32) {
            continue;
        }

        let window_title = titles.get(&pid_u32).cloned().unwrap_or_default();
        let display_name = if window_title.is_empty() {
            app_group_key(process)
        } else {
            window_title.clone()
        };

        processes.push(ProcessInfo {
            pid: pid_u32.to_string(),
            name,
            display_name,
            cpu_usage: process.cpu_usage(),
            memory_kb: process.memory() / 1024,
            total_written_bytes: process.disk_usage().total_written_bytes,
            written_bytes: process.disk_usage().written_bytes,
            total_read_bytes: process.disk_usage().total_read_bytes,
            read_bytes: process.disk_usage().read_bytes,
            has_window: true,
            window_title,
        });
    }

    // 内存占用从大到小，更符合管理直觉
    processes.sort_by(|a, b| b.memory_kb.cmp(&a.memory_kb));

    processes
}

// 杀死进程
#[tauri::command]
pub fn kill_process(pid: u32) -> Result<String, String> {
    let mut sys = System::new_all();
    sys.refresh_all();

    // 查找对应 PID 的进程
    if let Some(process) = sys.process(sysinfo::Pid::from_u32(pid)) {
        if process.kill() {
            Ok(format!("成功杀死进程 PID: {}", pid))
        } else {
            Err(format!("无法杀死进程 PID: {}，可能需要管理员权限", pid))
        }
    } else {
        Err(format!("未找到 PID: {} 的进程", pid))
    }
}