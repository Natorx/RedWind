use serde::Serialize;
use windows::Win32::Foundation::CloseHandle;
use windows::Win32::System::Threading::{
    OpenProcess, QueryFullProcessImageNameA, PROCESS_QUERY_LIMITED_INFORMATION,
};
use windows::{
    core::*,
    Win32::Foundation::E_FAIL,
    Win32::Media::Audio::Endpoints::IAudioEndpointVolume,
    Win32::Media::Audio::{
        eConsole, eRender, IAudioSessionControl, IAudioSessionControl2, IAudioSessionManager2,
        IMMDeviceEnumerator, ISimpleAudioVolume, MMDeviceEnumerator,
    },
    Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_ALL, COINIT_MULTITHREADED,
    },
};

use windows::core::PSTR;
use windows::Win32::System::Threading::PROCESS_NAME_FORMAT;

#[derive(Debug, Clone, Serialize)]
pub struct AudioSessionInfo {
    pub pid: u32,
    pub process_name: String,
    pub display_name: String,
    pub volume: f32,
    pub is_muted: bool,
    pub icon_path: String,
}

pub fn get_all_audio_sessions() -> windows::core::Result<Vec<AudioSessionInfo>> {
    unsafe {
        // 1. 初始化 COM
        let hr = CoInitializeEx(None, COINIT_MULTITHREADED);
        if hr.is_err() {
            return Err(hr.into());
        }

        // 2. 创建设备枚举器
        let device_enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)?;

        // 3. 获取默认音频渲染设备
        let device = device_enumerator.GetDefaultAudioEndpoint(eRender, eConsole)?;

        // 4. 激活音频会话管理器
        let manager: IAudioSessionManager2 = device.Activate(CLSCTX_ALL, None)?;

        // 5. 获取会话枚举器
        let session_enum = manager.GetSessionEnumerator()?;

        let count = session_enum.GetCount()?;

        let mut sessions = Vec::new();

        // 6. 遍历所有会话
        for i in 0..count {
            let session_ctl: IAudioSessionControl = match session_enum.GetSession(i) {
                Ok(s) => s,
                Err(_) => continue,
            };

            // 尝试获取 IAudioSessionControl2
            if let Ok(ctl2) = session_ctl.cast::<IAudioSessionControl2>() {
                let mut session_info = AudioSessionInfo {
                    pid: 0,
                    process_name: String::new(),
                    display_name: String::new(),
                    volume: 1.0,
                    is_muted: false,
                    icon_path: String::new(),
                };

                // 获取进程 ID
                if let Ok(pid) = ctl2.GetProcessId() {
                    session_info.pid = pid;
                    let process_name = get_process_name_by_pid(pid);
                    session_info.process_name = process_name.clone();
                    session_info.display_name = process_name;
                }

                // 获取显示名称
                if let Ok(display_name) = session_ctl.GetDisplayName() {
                    match display_name.to_string() {
                        Ok(name) => {
                            if !name.is_empty() {
                                session_info.display_name = name;
                            }
                        }
                        Err(_) => {}
                    }
                }

                // 获取音量控制接口
                if let Ok(vol_ctl) = session_ctl.cast::<ISimpleAudioVolume>() {
                    if let Ok(volume) = vol_ctl.GetMasterVolume() {
                        session_info.volume = volume;
                    }
                    if let Ok(muted) = vol_ctl.GetMute() {
                        session_info.is_muted = muted.as_bool();
                    }
                }

                if session_info.pid > 0 {
                    sessions.push(session_info);
                }
            }
        }

        CoUninitialize();
        sessions.sort_by(|a, b| a.process_name.cmp(&b.process_name));
        Ok(sessions)
    }
}

#[tauri::command]
pub async fn get_all_audio_sessions_cmd() -> std::result::Result<Vec<AudioSessionInfo>, String> {
    let result = tauri::async_runtime::spawn_blocking(|| get_all_audio_sessions()).await;

    match result {
        Ok(Ok(sessions)) => Ok(sessions),
        Ok(Err(e)) => Err(e.to_string()),
        Err(join_error) => Err(format!("线程任务失败: {}", join_error)),
    }
}

pub fn get_system_volume() -> windows::core::Result<f32> {
    unsafe {
        let hr = CoInitializeEx(None, COINIT_MULTITHREADED);
        if hr.is_err() {
            return Err(hr.into());
        }

        let device_enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)?;

        let device = device_enumerator.GetDefaultAudioEndpoint(eRender, eConsole)?;

        let endpoint_volume: IAudioEndpointVolume = device.Activate(CLSCTX_ALL, None)?;

        let volume = endpoint_volume.GetMasterVolumeLevelScalar()?;

        CoUninitialize();
        Ok(volume)
    }
}

#[tauri::command]
pub async fn get_system_volume_cmd() -> std::result::Result<f32, String> {
    let result = tauri::async_runtime::spawn_blocking(|| get_system_volume()).await;

    match result {
        Ok(Ok(volume)) => Ok(volume),
        Ok(Err(e)) => Err(e.to_string()),
        Err(join_error) => Err(format!("线程任务失败: {}", join_error)),
    }
}

// 设置系统主音量
pub fn set_system_volume(volume: f32) -> windows::core::Result<()> {
    let volume = volume.clamp(0.0, 1.0);

    unsafe {
        let hr = CoInitializeEx(None, COINIT_MULTITHREADED);
        if hr.is_err() {
            return Err(hr.into());
        }

        let device_enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)?;

        let device = device_enumerator.GetDefaultAudioEndpoint(eRender, eConsole)?;

        let endpoint_volume: IAudioEndpointVolume = device.Activate(CLSCTX_ALL, None)?;

        endpoint_volume.SetMasterVolumeLevelScalar(volume, std::ptr::null())?;

        CoUninitialize();
        Ok(())
    }
}

#[tauri::command]
pub async fn set_system_volume_cmd(volume: f32) -> std::result::Result<(), String> {
    let result: std::result::Result<std::result::Result<(), Error>, tauri::Error> =
        tauri::async_runtime::spawn_blocking(move || set_system_volume(volume)).await;

    match result {
        Ok(Ok(())) => Ok(()),
        Ok(Err(e)) => Err(e.to_string()),
        Err(join_error) => Err(format!("线程任务失败: {}", join_error)),
    }
}

// 设置单个应用音量
pub fn set_app_volume(pid: u32, volume: f32) -> windows::core::Result<()> {
    let volume = volume.clamp(0.0, 1.0);

    unsafe {
        let hr = CoInitializeEx(None, COINIT_MULTITHREADED);
        if hr.is_err() {
            return Err(hr.into());
        }

        let device_enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)?;

        let device = device_enumerator.GetDefaultAudioEndpoint(eRender, eConsole)?;

        let manager: IAudioSessionManager2 = device.Activate(CLSCTX_ALL, None)?;
        let session_enum = manager.GetSessionEnumerator()?;
        let count = session_enum.GetCount()?;

        for i in 0..count {
            let session_ctl = session_enum.GetSession(i)?;
            if let Ok(ctl2) = session_ctl.cast::<IAudioSessionControl2>() {
                if let Ok(session_pid) = ctl2.GetProcessId() {
                    if session_pid == pid {
                        if let Ok(vol_ctl) = session_ctl.cast::<ISimpleAudioVolume>() {
                            vol_ctl.SetMasterVolume(volume, &GUID::zeroed())?;
                            CoUninitialize();
                            return Ok(());
                        }
                    }
                }
            }
        }

        CoUninitialize();
        Err(windows::core::Error::new(
            E_FAIL,
            format!("未找到 PID: {}", pid),
        ))
    }
}

#[tauri::command]
pub async fn set_app_volume_cmd(pid: u32, volume: f32) -> std::result::Result<(), String> {
    let result = tauri::async_runtime::spawn_blocking(move || set_app_volume(pid, volume)).await;

    match result {
        Ok(Ok(())) => Ok(()),
        Ok(Err(e)) => Err(e.to_string()),
        Err(join_error) => Err(format!("线程任务失败: {}", join_error)),
    }
}

// 设置单个应用静音
pub fn set_app_mute(pid: u32, mute: bool) -> windows::core::Result<()> {
    unsafe {
        let hr = CoInitializeEx(None, COINIT_MULTITHREADED);
        if hr.is_err() {
            return Err(hr.into());
        }

        let device_enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)?;

        let device = device_enumerator.GetDefaultAudioEndpoint(eRender, eConsole)?;

        let manager: IAudioSessionManager2 = device.Activate(CLSCTX_ALL, None)?;
        let session_enum = manager.GetSessionEnumerator()?;
        let count = session_enum.GetCount()?;

        for i in 0..count {
            let session_ctl = session_enum.GetSession(i)?;
            if let Ok(ctl2) = session_ctl.cast::<IAudioSessionControl2>() {
                if let Ok(session_pid) = ctl2.GetProcessId() {
                    if session_pid == pid {
                        if let Ok(vol_ctl) = session_ctl.cast::<ISimpleAudioVolume>() {
                            vol_ctl.SetMute(mute.into(), &GUID::zeroed())?;
                            CoUninitialize();
                            return Ok(());
                        }
                    }
                }
            }
        }

        CoUninitialize();
        Err(windows::core::Error::new(
            E_FAIL,
            format!("未找到 PID: {}", pid),
        ))
    }
}

#[tauri::command]
pub async fn set_app_mute_cmd(pid: u32, mute: bool) -> std::result::Result<(), String> {
    let result = tauri::async_runtime::spawn_blocking(move || set_app_mute(pid, mute)).await;

    match result {
        Ok(Ok(())) => Ok(()),
        Ok(Err(e)) => Err(e.to_string()),
        Err(join_error) => Err(format!("线程任务失败: {}", join_error)),
    }
}

/// 通过 PID 获取进程名称
unsafe fn get_process_name_by_pid(pid: u32) -> String {
    // 打开进程
    let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
    let handle = match handle {
        Ok(h) => h,
        Err(_) => return format!("pid:{}", pid),
    };

    let mut buffer = [0u8; 260];
    let mut size = buffer.len() as u32;

    // 正确调用 QueryFullProcessImageNameA
    // 参数: HANDLE, PROCESS_NAME_FORMAT, PSTR, *mut u32
    let result = QueryFullProcessImageNameA(
        handle,
        PROCESS_NAME_FORMAT(0),    // 第二个参数用 PROCESS_NAME_FORMAT 包装整数
        PSTR(buffer.as_mut_ptr()), // 第三个参数用 PCSTR 包装指针
        &mut size,
    );

    let _ = CloseHandle(handle);

    if result.is_err() {
        return format!("pid:{}", pid);
    }

    // 从路径中提取文件名（不含扩展名）
    let path = String::from_utf8_lossy(&buffer[..size as usize]).to_string();
    std::path::Path::new(&path)
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string()
}
