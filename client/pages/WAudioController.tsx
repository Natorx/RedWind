import { invoke } from '@tauri-apps/api/core';
import React, { useEffect, useState } from 'react';

interface AudioSessionInfo {
  pid: number;
  process_name: string;
  display_name: string;
  volume: number;
  is_muted: boolean;
  icon_path: string;
}

const WAudioController: React.FC = () => {
  const [sessions, setSessions] = useState<AudioSessionInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [systemVolume, setSystemVolume] = useState<number>(1.0);
  const [volumeLoading, setVolumeLoading] = useState<boolean>(false);

  // 获取音频会话列表
  const fetchAudioSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<AudioSessionInfo[]>('get_all_audio_sessions_cmd');
      setSessions(result);
    } catch (err) {
      setError(err as string);
      console.error('获取音频会话失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 获取系统主音量
  const fetchSystemVolume = async () => {
    try {
      const volume = await invoke<number>('get_system_volume_cmd');
      setSystemVolume(volume);
    } catch (err) {
      console.error('获取系统音量失败:', err);
    }
  };

  // 设置系统主音量
  const setSystemVolumeHandler = async (volume: number) => {
    setVolumeLoading(true);
    try {
      await invoke('set_system_volume_cmd', { volume });
      setSystemVolume(volume);
    } catch (err) {
      console.error('设置系统音量失败:', err);
    } finally {
      setVolumeLoading(false);
    }
  };

  // 调整单个应用音量
  const setAppVolume = async (pid: number, volume: number) => {
    try {
      await invoke('set_app_volume_cmd', { pid, volume });
      // 刷新列表以显示最新音量
      fetchAudioSessions();
    } catch (err) {
      console.error('设置应用音量失败:', err);
    }
  };

  // 切换单个应用静音
  const toggleAppMute = async (pid: number, currentMuted: boolean) => {
    try {
      await invoke('set_app_mute_cmd', { pid, mute: !currentMuted });
      fetchAudioSessions();
    } catch (err) {
      console.error('切换静音失败:', err);
    }
  };

  useEffect(() => {
    fetchAudioSessions();
    fetchSystemVolume();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Windows 音频控制器</h2>
      
      {/* 系统音量控制区域 */}
      <div style={{ 
        marginBottom: '30px', 
        padding: '15px', 
        backgroundColor: '#e8f4f8', 
        borderRadius: '8px' 
      }}>
        <h3>系统主音量</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span>🔊</span>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(systemVolume * 100)}
            onChange={(e) => setSystemVolumeHandler(parseInt(e.target.value) / 100)}
            disabled={volumeLoading}
            style={{ flex: 1 }}
          />
          <span>{Math.round(systemVolume * 100)}%</span>
          <button onClick={fetchSystemVolume} disabled={volumeLoading}>
            🔄
          </button>
        </div>
      </div>

      {/* 刷新按钮 */}
      <button onClick={fetchAudioSessions} disabled={loading} style={{ marginBottom: '20px' }}>
        {loading ? '刷新中...' : '刷新应用列表'}
      </button>

      {error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          错误: {error}
        </div>
      )}

      {/* 应用音量列表 */}
      {!loading && !error && (
        <div style={{ marginTop: '20px' }}>
          <h3>应用音量合成器 ({sessions.length})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>进程名</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>PID</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>音量</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>静音状态</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.pid}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {session.display_name || session.process_name}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{session.pid}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', width: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={Math.round(session.volume * 100)}
                        onChange={(e) => setAppVolume(session.pid, parseInt(e.target.value) / 100)}
                        style={{ flex: 1 }}
                      />
                      <span style={{ minWidth: '45px' }}>{Math.round(session.volume * 100)}%</span>
                    </div>
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    <button 
                      onClick={() => toggleAppMute(session.pid, session.is_muted)}
                      style={{ 
                        padding: '4px 12px', 
                        cursor: 'pointer',
                        backgroundColor: session.is_muted ? '#ff4444' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px'
                      }}
                    >
                      {session.is_muted ? '🔇 解除静音' : '🔊 静音'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WAudioController;