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

  const fetchSystemVolume = async () => {
    try {
      const volume = await invoke<number>('get_system_volume_cmd');
      setSystemVolume(volume);
    } catch (err) {
      console.error('获取系统音量失败:', err);
    }
  };

  const setSystemVolumeHandler = async (volume: number) => {
    try {
      await invoke('set_system_volume_cmd', { volume });
      setSystemVolume(volume);
    } catch (err) {
      console.error('设置系统音量失败:', err);
    }
  };

  const setAppVolume = async (pid: number, volume: number) => {
    try {
      await invoke('set_app_volume_cmd', { pid, volume });
      fetchAudioSessions();
    } catch (err) {
      console.error('设置应用音量失败:', err);
    }
  };

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

  const getVolumeIcon = (volume: number, isMuted: boolean) => {
    if (isMuted || volume === 0) return '🔇';
    if (volume < 0.3) return '🔈';
    if (volume < 0.7) return '🔉';
    return '🔊';
  };

  return (
    <div style={{
      background: '#ffffff',
      minHeight: '100vh',
      padding: '32px 24px',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {/* 头部 */}
        <div style={{
          marginBottom: '32px',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '20px',
        }}>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: '500',
            color: '#111827',
            marginBottom: '8px',
            letterSpacing: '-0.01em',
          }}>
            Windows 音频控制器
          </h1>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
          }}>
            控制系统音量和每个应用的独立音频
          </p>
        </div>

        {/* 系统音量 */}
        <div style={{
          background: '#f9fafb',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '32px',
          border: '1px solid #f0f0f0',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}>
              <span style={{
                fontSize: '1.75rem',
              }}>
                {getVolumeIcon(systemVolume, false)}
              </span>
              <div>
                <h2 style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '2px',
                }}>
                  系统主音量
                </h2>
                <p style={{
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                }}>
                  控制整个系统的输出音量
                </p>
              </div>
            </div>
            <div style={{
              flex: 1,
              minWidth: '240px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>0%</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(systemVolume * 100)}
                  onChange={(e) => setSystemVolumeHandler(parseInt(e.target.value) / 100)}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    WebkitAppearance: 'none',
                    background: '#e5e7eb',
                    cursor: 'pointer',
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>100%</span>
              </div>
              <div style={{
                marginTop: '8px',
                textAlign: 'right',
              }}>
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#111827',
                }}>
                  {Math.round(systemVolume * 100)}%
                </span>
              </div>
            </div>
            <button
              onClick={fetchSystemVolume}
              style={{
                background: 'transparent',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.875rem',
                color: '#6b7280',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              🔄 刷新
            </button>
          </div>
        </div>

        {/* 应用列表头部 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div>
            <h2 style={{
              fontSize: '1rem',
              fontWeight: '500',
              color: '#111827',
              marginBottom: '4px',
            }}>
              应用音量合成器
            </h2>
            <p style={{
              fontSize: '0.75rem',
              color: '#9ca3af',
            }}>
              {sessions.length} 个应用正在播放音频
            </p>
          </div>
          <button
            onClick={fetchAudioSessions}
            disabled={loading}
            style={{
              background: '#111827',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.75rem',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#111827';
            }}
          >
            {loading ? '刷新中...' : '刷新列表'}
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontSize: '0.75rem',
            color: '#dc2626',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* 应用列表 */}
        {!loading && !error && (
          <div>
            {sessions.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 20px',
                background: '#f9fafb',
                borderRadius: '16px',
                border: '1px solid #f0f0f0',
              }}>
                <span style={{
                  fontSize: '2.5rem',
                  display: 'block',
                  marginBottom: '12px',
                  opacity: 0.5,
                }}>
                  🎧
                </span>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                }}>
                  暂无音频会话
                </p>
                <p style={{
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                  marginTop: '4px',
                }}>
                  打开应用播放音频后会显示在这里
                </p>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                {sessions.map((session) => (
                  <div
                    key={session.pid}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '12px 16px',
                      background: '#f9fafb',
                      borderRadius: '12px',
                      transition: 'all 0.2s',
                      border: '1px solid #f0f0f0',
                    }}
                  >
                    {/* 图标和名称 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      minWidth: '180px',
                    }}>
                      <span style={{
                        fontSize: '1.25rem',
                        opacity: 0.7,
                      }}>
                        {getVolumeIcon(session.volume, session.is_muted)}
                      </span>
                      <div>
                        <div style={{
                          fontSize: '0.813rem',
                          fontWeight: '500',
                          color: '#111827',
                        }}>
                          {session.display_name || session.process_name}
                        </div>
                        <div style={{
                          fontSize: '0.688rem',
                          color: '#9ca3af',
                        }}>
                          PID: {session.pid}
                        </div>
                      </div>
                    </div>

                    {/* 音量滑块 */}
                    <div style={{
                      flex: 1,
                      minWidth: '160px',
                    }}>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={Math.round(session.volume * 100)}
                        onChange={(e) => setAppVolume(session.pid, parseInt(e.target.value) / 100)}
                        style={{
                          width: '100%',
                          height: '3px',
                          borderRadius: '1.5px',
                          WebkitAppearance: 'none',
                          background: '#e5e7eb',
                          cursor: 'pointer',
                        }}
                      />
                    </div>

                    {/* 音量和静音按钮 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      minWidth: '100px',
                      justifyContent: 'flex-end',
                    }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        color: '#111827',
                        minWidth: '40px',
                        textAlign: 'center',
                      }}>
                        {Math.round(session.volume * 100)}%
                      </span>
                      <button
                        onClick={() => toggleAppMute(session.pid, session.is_muted)}
                        style={{
                          padding: '6px 14px',
                          fontSize: '0.688rem',
                          fontWeight: '500',
                          cursor: 'pointer',
                          background: session.is_muted ? '#ef4444' : '#f3f4f6',
                          color: session.is_muted ? 'white' : '#374151',
                          border: 'none',
                          borderRadius: '6px',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          if (!session.is_muted) e.currentTarget.style.background = '#e5e7eb';
                        }}
                        onMouseLeave={(e) => {
                          if (!session.is_muted) e.currentTarget.style.background = '#f3f4f6';
                        }}
                      >
                        {session.is_muted ? '解除静音' : '静音'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WAudioController;