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

  useEffect(() => {
    fetchAudioSessions();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Windows 音频控制器</h2>
      <button onClick={fetchAudioSessions} disabled={loading}>
        {loading ? '刷新中...' : '刷新列表'}
      </button>

      {error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          错误: {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ marginTop: '20px' }}>
          <h3>音频会话列表 ({sessions.length})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>进程名</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>PID</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>音量</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>静音状态</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.pid}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{session.display_name || session.process_name}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{session.pid}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{Math.round(session.volume * 100)}%</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{session.is_muted ? '🔇 静音' : '🔊 正常'}</td>
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