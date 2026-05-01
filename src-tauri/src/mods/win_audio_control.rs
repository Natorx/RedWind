use serde::Serialize;
use tauri::async_runtime::spawn_blocking;
use windows::{
    core::*,
    Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED, CoUninitialize, CLSCTX_ALL, CoCreateInstance},
    Win32::Media::Audio::{
        IMMDeviceEnumerator, MMDeviceEnumerator, eRender, eConsole,
        IAudioSessionManager2, IAudioSessionControl,
        IAudioSessionControl2, ISimpleAudioVolume,
    },
};

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
                    session_info.process_name = format!("pid:{}", pid);
                    session_info.display_name = session_info.process_name.clone();
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
    let result = tauri::async_runtime::spawn_blocking(|| {
        get_all_audio_sessions()
    }).await;
    
    match result {
        Ok(Ok(sessions)) => Ok(sessions),
        Ok(Err(e)) => Err(e.to_string()),
        Err(join_error) => Err(format!("线程任务失败: {}", join_error)),
    }
}