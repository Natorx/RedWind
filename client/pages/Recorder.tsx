import React, { useState, useRef, useEffect } from 'react';

interface AudioChunk {
  blob: Blob;
  url: string;
}

const Recorder: React.FC = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // 初始化录音器
  useEffect(() => {
    const initRecorder = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        
        const chunks: Blob[] = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };
        
        recorder.onstop = () => {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);
          setRecordedAudio(audioUrl);
          setAudioChunks([]);
        };
        
        setMediaRecorder(recorder);
      } catch (error) {
        console.error('无法访问麦克风:', error);
        alert('请允许麦克风访问权限');
      }
    };
    
    initRecorder();
    
    // 清理函数
    return () => {
      if (recordedAudio) {
        URL.revokeObjectURL(recordedAudio);
      }
    };
  }, []);

  // 开始录音
  const startRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'inactive') {
      setAudioChunks([]);
      mediaRecorder.start();
      setIsRecording(true);
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  // 播放录音
  const playRecording = () => {
    if (audioRef.current && recordedAudio) {
      audioRef.current.src = recordedAudio;
      audioRef.current.play();
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>简易录音机</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={startRecording}
          disabled={isRecording}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: isRecording ? '#ccc' : '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRecording ? 'not-allowed' : 'pointer'
          }}
        >
          {isRecording ? '录音中...' : '开始录音'}
        </button>
        
        <button 
          onClick={stopRecording}
          disabled={!isRecording}
          style={{
            padding: '10px 20px',
            backgroundColor: !isRecording ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !isRecording ? 'not-allowed' : 'pointer'
          }}
        >
          停止录音
        </button>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={playRecording}
          disabled={!recordedAudio}
          style={{
            padding: '10px 20px',
            backgroundColor: !recordedAudio ? '#ccc' : '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !recordedAudio ? 'not-allowed' : 'pointer'
          }}
        >
          播放录音
        </button>
      </div>
      
      <div>
        <audio 
          ref={audioRef} 
          controls 
          style={{ width: '100%', maxWidth: '400px' }}
        />
      </div>
      
      <div style={{ marginTop: '20px', color: '#666' }}>
        <p>状态: {isRecording ? '正在录音...' : recordedAudio ? '录音就绪' : '准备就绪'}</p>
        <p>音频格式: WebM (Chrome/Edge) 或 Ogg (Firefox)</p>
      </div>
    </div>
  );
};

export default Recorder;
