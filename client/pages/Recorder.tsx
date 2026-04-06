import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Download, Trash2 } from 'lucide-react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

const Recorder: React.FC = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

    // 清理函数
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
      // 停止所有音轨
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

  // 下载录音（使用 Tauri 保存）
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
  };

  return (
  <div className='w-full h-full flex justify-center items-center'>
    <div className="max-w-md mx-auto p-8 bg-white rounded-3xl shadow-xl">
      <div className="text-center mb-10">
        <div className="mx-auto w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
          <Mic className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800">语音录音机</h2>
        <p className="text-gray-500 mt-2">清晰录制你的声音</p>
      </div>

      {/* 录音控制按钮 */}
      <div className="flex justify-center gap-4 mb-10">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="flex items-center gap-3 bg-red-500 hover:bg-red-600 transition-all text-white px-10 py-4 rounded-2xl text-lg font-medium shadow-lg active:scale-95"
          >
            <Mic className="w-6 h-6" />
            开始录音
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center gap-3 bg-gray-800 hover:bg-black transition-all text-white px-10 py-4 rounded-2xl text-lg font-medium shadow-lg active:scale-95 animate-pulse"
          >
            <Square className="w-6 h-6" />
            停止录音
          </button>
        )}
      </div>

      {/* 录音中提示 */}
      {isRecording && (
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-red-500 font-medium">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
            正在录音中...
          </div>
          <p className="text-sm text-gray-500 mt-1">点击上方按钮停止录音</p>
        </div>
      )}

      {/* 录音结果区域 */}
      {recordedAudio && audioBlob && (
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <p className="font-medium text-gray-700">已录制完成</p>
            <button
              onClick={deleteRecording}
              className="text-gray-400 hover:text-red-500 transition-colors"
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
            className="w-full mb-4"
            controls
          />

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button
              onClick={togglePlay}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-medium transition-all"
            >
              <Play className="w-5 h-5" />
              {isPlaying ? '暂停' : '播放'}
            </button>

            <button
              onClick={downloadRecording}
              className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-medium transition-all"
            >
              <Download className="w-5 h-5" />
              下载录音
            </button>
          </div>
        </div>
      )}

      {/* 状态提示 */}
      <div className="text-center mt-8 text-sm text-gray-500">
        {isRecording 
          ? "录音进行中 • 点击停止按钮结束" 
          : recordedAudio 
            ? "录音已就绪 • 可播放或下载" 
            : "准备就绪 • 点击开始录音"}
      </div>
    </div>
  </div>
  );
};

export default Recorder;