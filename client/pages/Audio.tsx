import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Download, Trash2, Pause } from 'lucide-react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { useMsg } from '../components/Msg';
interface AudioSessionInfo {
  pid: number;
  process_name: string;
  display_name: string;
  volume: number;
  is_muted: boolean;
  icon_path: string;
}

/** 后端 `system-volume-changed` 事件负载 */
interface SystemVolumeSnapshot {
  volume: number;
  is_muted: boolean;
}

/** 轮询兜底间隔（毫秒）：未收到事件推送时的最大刷新延迟 */
const AUDIO_POLL_INTERVAL_MS = 3000;

const SystemVolumeCard: React.FC = () => {
  const [systemVolume, setSystemVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const fetchSystemVolume = async () => {
    try {
      const volume = await invoke<number>('get_system_volume_cmd');
      setSystemVolume(volume);
    } catch (err) {
      console.error('获取系统音量失败:', err);
    }
  };

  const fetchSystemMute = async () => {
    try {
      const muted = await invoke<boolean>('get_system_mute_cmd');
      setIsMuted(muted);
    } catch (err) {
      console.error('获取系统静音状态失败:', err);
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

  const toggleSystemMute = async () => {
    const next = !isMuted;
    try {
      await invoke('set_system_mute_cmd', { mute: next });
      setIsMuted(next);
    } catch (err) {
      console.error('切换系统静音失败:', err);
    }
  };

  // 自动检测 + 定期兜底：
  // - 事件驱动：后端注册 IAudioEndpointVolumeCallback，系统音量/静音变化时立即推送
  // - 定时兜底：事件丢失（设备切换、监听注册失败）时仍能收敛到真实状态
  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    const applySnapshot = (snapshot: SystemVolumeSnapshot) => {
      if (disposed) return;
      setSystemVolume(snapshot.volume);
      setIsMuted(snapshot.is_muted);
    };

    const startListener = async () => {
      try {
        unlisten = await listen<SystemVolumeSnapshot>(
          'system-volume-changed',
          (event) => applySnapshot(event.payload),
        );
      } catch (err) {
        console.error('监听系统音量变化失败:', err);
      }

      try {
        await invoke('start_system_volume_listener_cmd');
      } catch (err) {
        // 监听注册失败不阻断轮询兜底
        console.error('注册系统音量监听失败:', err);
      }
    };

    startListener();

    const pollTimer = setInterval(() => {
      if (disposed) return;
      fetchSystemVolume();
      fetchSystemMute();
    }, AUDIO_POLL_INTERVAL_MS);

    return () => {
      disposed = true;
      clearInterval(pollTimer);
      if (unlisten) unlisten();
      invoke('stop_system_volume_listener_cmd').catch((err) =>
        console.error('停止系统音量监听失败:', err),
      );
    };
  }, []);

  const getVolumeIcon = (volume: number, isMuted: boolean) => {
    if (isMuted || volume === 0) return '🔇';
    if (volume < 0.3) return '🔈';
    if (volume < 0.7) return '🔉';
    return '🔊';
  };

  return (
      <div className="bg-[rgba(30,30,35,0.8)] backdrop-blur-[10px] rounded-2xl p-5 pb-6 border bg-neutral-900/80 shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-5">
          <div className="flex items-center gap-4">
            <span className="text-[1.75rem]">
              {getVolumeIcon(systemVolume, isMuted)}
            </span>
            <div>
              <h2 className="text-xs font-medium text-gray-300 mb-0.5">
                系统主音量
              </h2>
            </div>
          </div>
          <div className="flex-1 min-w-[200px] max-w-[320px]">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">0%</span>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(systemVolume * 100)}
                onChange={(e) =>
                  setSystemVolumeHandler(parseInt(e.target.value) / 100)
                }
                className="flex-1 h-1 rounded-full bg-gray-700 cursor-pointer appearance-none 
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:cursor-pointer
                    hover:bg-red-500 transition-colors"
              />
              <span className="text-xs text-gray-500">100%</span>
              <span className="text-sm font-medium text-red-500 w-12 text-right tabular-nums shrink-0">
                {Math.round(systemVolume * 100)}%
              </span>
            </div>
          </div>
          <button
            onClick={toggleSystemMute}
            className={`px-3.5 py-1.5 text-[0.688rem] font-medium cursor-pointer
                border-none rounded-md transition-all hover:bg-red-500 shrink-0
                ${
                  isMuted
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-700/80 text-gray-300 hover:text-white'
                }`}
          >
            {isMuted ? '解除静音' : '静音'}
          </button>
        </div>
      </div>
  );
};

// 应用音量合成器（标题已移除，供与「资源占用」左右并排）
const AppVolumeMixer: React.FC = () => {
  const [sessions, setSessions] = useState<AudioSessionInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAudioSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<AudioSessionInfo[]>(
        'get_all_audio_sessions_cmd',
      );
      setSessions(result);
    } catch (err) {
      setError(err as string);
      console.error('获取音频会话失败:', err);
    } finally {
      setLoading(false);
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

  // 定期重新获取音频列表：
  // 音频会话的新增/退出无法通过 IAudioEndpointVolume 回调感知，
  // 因此这里以固定间隔重新枚举，保证列表与真实会话保持一致。
  useEffect(() => {
    let disposed = false;

    const refresh = () => {
      if (disposed) return;
      fetchAudioSessions();
    };

    refresh();
    const pollTimer = setInterval(refresh, AUDIO_POLL_INTERVAL_MS);

    return () => {
      disposed = true;
      clearInterval(pollTimer);
    };
  }, []);

  const getVolumeIcon = (volume: number, isMuted: boolean) => {
    if (isMuted || volume === 0) return '🔇';
    if (volume < 0.3) return '🔈';
    if (volume < 0.7) return '🔉';
    return '🔊';
  };

  return (
    <div className="flex flex-col shrink-0">
      {/* 错误提示 */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5 text-xs text-red-500">
          ⚠️ {error}
        </div>
      )}

      {/* 应用列表 */}
      {!loading && !error && (
        <div>
          {sessions.length === 0 ? (
            <div className="text-center py-12 px-5 bg-[rgba(30,30,35,0.6)] rounded-2xl border border-red-500/20">
              <span className="text-4xl block mb-3 opacity-50">🎧</span>
              <p className="text-sm text-gray-400">暂无音频会话</p>
              <p className="text-xs text-gray-500 mt-1">
                打开应用播放音频后会显示在这里
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sessions.map((session) => (
                <div
                  key={session.pid}
                  className="flex items-center gap-4 px-4 py-3 bg-neutral-900/80 rounded-xl 
                      transition-all border border-red-500/15 hover:bg-[rgba(40,40,48,0.8)] hover:border-red-500/30"
                >
                  {/* 图标和名称 */}
                  <div className="flex items-center gap-3 min-w-[180px]">
                    <span className="text-xl opacity-70">
                      {getVolumeIcon(session.volume, session.is_muted)}
                    </span>
                    <div>
                      <div className="text-[0.813rem] font-medium text-white">
                        {session.display_name || session.process_name}
                      </div>
                      <div className="text-[0.688rem] text-gray-500">
                        PID: {session.pid}
                      </div>
                    </div>
                  </div>

                  {/* 音量滑块 */}
                  <div className="flex-1 min-w-[160px]">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(session.volume * 100)}
                      onChange={(e) =>
                        setAppVolume(
                          session.pid,
                          parseInt(e.target.value) / 100,
                        )
                      }
                      className="w-full h-[3px] rounded-[1.5px] bg-gray-700 cursor-pointer appearance-none
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:cursor-pointer
                          hover:bg-red-500 transition-colors"
                    />
                  </div>

                  {/* 音量和静音按钮 */}
                  <div className="flex items-center gap-3 min-w-[100px] justify-end">
                    <span className="text-xs font-medium text-red-500 min-w-[40px] text-center">
                      {Math.round(session.volume * 100)}%
                    </span>
                    <button
                      onClick={() =>
                        toggleAppMute(session.pid, session.is_muted)
                      }
                      className={`px-3.5 py-1.5 text-[0.688rem] font-medium cursor-pointer 
                          border-none rounded-md transition-all hover:bg-red-500
                          ${
                            session.is_muted
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-700/80 text-gray-300 hover:text-white'
                          }`}
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
  );
};

const Recorder: React.FC = () => {
  const { showMsg } = useMsg();
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [recordingTime, setRecordingTime] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const micErrorNotifiedRef = useRef(false);

  // 录音计时
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        setRecordingTime(0);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // 获取音频时长
  useEffect(() => {
    if (audioRef.current && recordedAudio) {
      audioRef.current.addEventListener('loadedmetadata', () => {
        setAudioDuration(audioRef.current?.duration || 0);
      });
    }
  }, [recordedAudio]);

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 初始化录音
  useEffect(() => {
    let recorder: MediaRecorder;

    const initRecorder = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
          },
        });
        streamRef.current = stream;

        recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = recorder;

        const chunks: Blob[] = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);

          setAudioBlob(blob);
          setRecordedAudio(url);
          setIsRecording(false);
        };
      } catch (error) {
        console.error('麦克风访问失败:', error);
        if (!micErrorNotifiedRef.current) {
          micErrorNotifiedRef.current = true;
          showMsg('无法访问麦克风，请检查权限设置', 'error', 4000);
        }
      }
    };

    initRecorder();

    return () => {
      if (recordedAudio) URL.revokeObjectURL(recordedAudio);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // 开始录音
  const startRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'inactive'
    ) {
      setRecordedAudio(null);
      setAudioBlob(null);
      mediaRecorderRef.current.start();
      setIsRecording(true);
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    }
  };

  // 播放/暂停
  const togglePlay = () => {
    if (!audioRef.current || !recordedAudio) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  // 下载录音
  const downloadRecording = async () => {
    if (!audioBlob) return;

    try {
      const fileName = `recording_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;

      const filePath = await save({
        defaultPath: fileName,
        filters: [{ name: 'WebM Audio', extensions: ['webm'] }],
      });

      if (!filePath) return;

      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      await writeFile(filePath, uint8Array);

      alert(`录音已保存至：${filePath}`);
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败，请重试');
    }
  };

  // 删除录音
  const deleteRecording = () => {
    if (recordedAudio) {
      URL.revokeObjectURL(recordedAudio);
    }
    setRecordedAudio(null);
    setAudioBlob(null);
    setIsPlaying(false);
    setAudioDuration(0);
  };
  return (
    <div className="w-full bg-neutral-900/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-red-500/20 overflow-hidden shrink-0">
      <div className="flex min-h-[120px]">
        {/* 左侧 - 红色麦克风区域 */}
        <div className="relative w-32 bg-gradient-to-br from-red-500 to-red-700 flex flex-col items-center justify-center py-4">
          {/* 麦克风图标 */}
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-xl">
              <Mic className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* 波形装饰 */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-0.5 pb-2">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className={`w-0.5 bg-white/40 rounded-full transition-all duration-300 ${
                  isRecording ? 'animate-wave' : 'h-3'
                }`}
                style={{
                  animationDelay: `${i * 0.1}s`,
                  height: isRecording
                    ? `${6 + Math.sin(Date.now() * 0.005 + i) * 4}px`
                    : '3px',
                }}
              />
            ))}
          </div>
        </div>

        {/* 右侧 - 内容区域 */}
        <div className="flex-1 py-3 pr-5 pl-4 flex flex-col min-h-0 overflow-y-auto">
          {/* 标题和计时器行 */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-bold bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
                录音机
              </h2>
            </div>

            {/* 录音计时器 */}
            {isRecording && (
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 rounded-full border border-red-500/30">
                <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-400 font-mono text-xs font-bold">
                  {formatTime(recordingTime)}
                </span>
              </div>
            )}
          </div>

          {/* 录音控制按钮 - 只有在没有录制音频时才显示 */}
          {!recordedAudio && (
            <div className="mb-2">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className={`group flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all shadow-lg active:scale-95 ${'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-red-500/50 hover:shadow-red-500/70'}`}
                >
                  <Mic className="w-3 h-3 group-hover:scale-110 transition-transform" />
                  开始录音
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white rounded-lg text-xs font-medium transition-all shadow-lg active:scale-95"
                >
                  <Square className="w-3 h-3" />
                  停止录音
                </button>
              )}
            </div>
          )}

          {/* 录音结果区域 - 只有在有录音时才显示 */}
          {recordedAudio && audioBlob && (
            <div className="bg-neutral-800/50 rounded-lg p-2 border border-red-500/20 mb-2">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="font-medium text-neutral-300 text-[10px]">
                    录音已就绪
                  </p>
                </div>
                <button
                  onClick={deleteRecording}
                  className="text-neutral-500 hover:text-red-400 transition-colors p-0.5 hover:bg-red-500/10 rounded"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* 音频播放器 */}
              <audio
                ref={audioRef}
                src={recordedAudio}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />

              {/* 自定义播放器控件 */}
              <div className="space-y-1.5">
                {/* 进度条 */}
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[8px] text-neutral-400">
                    <span>
                      {formatTime(audioRef.current?.currentTime || 0)}
                    </span>
                    <span>{formatTime(audioDuration)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={audioDuration || 0}
                    step="0.01"
                    value={audioRef.current?.currentTime || 0}
                    onChange={(e) => {
                      if (audioRef.current) {
                        audioRef.current.currentTime = parseFloat(
                          e.target.value,
                        );
                      }
                    }}
                    className="w-full h-0.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 
                         [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-red-500 
                         [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                         [&::-webkit-slider-thumb]:hover:scale-125 [&::-webkit-slider-thumb]:transition-transform"
                  />
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-1.5">
                  <button
                    onClick={togglePlay}
                    className="flex-1 flex items-center justify-center gap-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-1 rounded-md text-[10px] font-medium transition-all shadow-lg shadow-blue-500/25"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-2.5 h-2.5" />
                        暂停
                      </>
                    ) : (
                      <>
                        <Play className="w-2.5 h-2.5" />
                        播放
                      </>
                    )}
                  </button>

                  <button
                    onClick={downloadRecording}
                    className="flex-1 flex items-center justify-center gap-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-1 rounded-md text-[10px] font-medium transition-all shadow-lg shadow-green-500/25"
                  >
                    <Download className="w-2.5 h-2.5" />
                    下载
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 状态提示 */}
          <div className="text-left">
            <p className="text-[9px] text-neutral-500">
              {isRecording
                ? '🎙️ 录音进行中 • 点击停止按钮结束'
                : recordedAudio
                  ? '✅ 录音已就绪 • 可播放或下载'
                  : '🎤 准备就绪 • 点击开始录音'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AudioPanel: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <Recorder />
      <SystemVolumeCard />
    </div>
  );
};

export default AudioPanel;

export { Recorder, SystemVolumeCard, AppVolumeMixer };