import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Download, Trash2, Pause } from 'lucide-react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

const Recorder: React.FC = () => {
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

  // 录音计时
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
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
            sampleRate: 44100
          } 
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
        alert('无法访问麦克风，请检查权限设置');
      }
    };

    initRecorder();

    return () => {
      if (recordedAudio) URL.revokeObjectURL(recordedAudio);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 开始录音
  const startRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
      setRecordedAudio(null);
      setAudioBlob(null);
      mediaRecorderRef.current.start();
      setIsRecording(true);
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
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
    <div className="min-h-screen bg-gradient-to-br from-red-950 to-neutral-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* 主卡片 */}
        <div className="bg-neutral-900/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-red-500/20 overflow-hidden">
          {/* 头部装饰 */}
          <div className="relative h-32 bg-gradient-to-r from-red-500/20 to-red-700/20">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/50">
                <Mic className="w-10 h-10 text-white" />
              </div>
            </div>
            {/* 波形装饰 */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-1 pb-4">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 bg-red-500/40 rounded-full transition-all duration-300 ${
                    isRecording ? 'animate-wave' : 'h-4'
                  }`}
                  style={{ 
                    animationDelay: `${i * 0.1}s`,
                    height: isRecording ? `${8 + Math.sin(Date.now() * 0.005 + i) * 8}px` : '4px'
                  }}
                />
              ))}
            </div>
          </div>

          <div className="p-8">
            {/* 标题 */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
                语音录音机
              </h2>
              <p className="text-neutral-400 text-sm mt-1">
                清晰录制你的声音
              </p>
            </div>

            {/* 录音计时器 */}
            {isRecording && (
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 rounded-full border border-red-500/30">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-400 font-mono text-lg font-bold">
                    {formatTime(recordingTime)}
                  </span>
                </div>
              </div>
            )}

            {/* 录音控制按钮 */}
            <div className="flex justify-center mb-8">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={!!recordedAudio}
                  className={`group relative flex items-center gap-3 px-12 py-4 rounded-2xl text-lg font-medium transition-all shadow-lg active:scale-95 ${
                    recordedAudio
                      ? 'bg-neutral-700 cursor-not-allowed text-neutral-400'
                      : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-red-500/50 hover:shadow-red-500/70'
                  }`}
                >
                  <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  开始录音
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-3 px-12 py-4 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white rounded-2xl text-lg font-medium transition-all shadow-lg active:scale-95"
                >
                  <Square className="w-5 h-5" />
                  停止录音
                </button>
              )}
            </div>

            {/* 录音结果区域 */}
            {recordedAudio && audioBlob && (
              <div className="bg-neutral-800/50 rounded-2xl p-6 border border-red-500/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <p className="font-medium text-neutral-300">录音已就绪</p>
                  </div>
                  <button
                    onClick={deleteRecording}
                    className="text-neutral-500 hover:text-red-400 transition-colors p-1 hover:bg-red-500/10 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" />
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
                <div className="space-y-4">
                  {/* 进度条 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-neutral-400">
                      <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
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
                          audioRef.current.currentTime = parseFloat(e.target.value);
                        }
                      }}
                      className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer
                               [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                               [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-red-500 
                               [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                               [&::-webkit-slider-thumb]:hover:scale-125 [&::-webkit-slider-thumb]:transition-transform"
                    />
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-3">
                    <button
                      onClick={togglePlay}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/25"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-5 h-5" />
                          暂停
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5" />
                          播放
                        </>
                      )}
                    </button>

                    <button
                      onClick={downloadRecording}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 rounded-xl font-medium transition-all shadow-lg shadow-green-500/25"
                    >
                      <Download className="w-5 h-5" />
                      下载
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 状态提示 */}
            <div className="text-center mt-6">
              <p className="text-sm text-neutral-500">
                {isRecording 
                  ? "🎙️ 录音进行中 • 点击停止按钮结束" 
                  : recordedAudio 
                    ? "✅ 录音已就绪 • 可播放或下载" 
                    : "🎤 准备就绪 • 点击开始录音"}
              </p>
            </div>
          </div>
        </div>

        {/* 底部提示 */}
        <div className="mt-4 text-center">
          <p className="text-xs text-neutral-600">
            支持 WebM 格式 • 高质量音频录制
          </p>
        </div>
      </div>

      <style>{`
        @keyframes wave {
          0%, 100% { height: 4px; }
          50% { height: 20px; }
        }
        
        .animate-wave {
          animation: wave 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Recorder;