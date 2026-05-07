// src/components/P2PChat.tsx
import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface ChatMessage {
  from: string;
  content: string;
}

const P2PChat: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [peerId, setPeerId] = useState('');
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [status, setStatus] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 监听 P2P 事件
// src/components/P2PChat.tsx

useEffect(() => {
    // 监听启动成功
    const unlistenReady = listen('p2p_ready', (event: any) => {
        setPeerId(event.payload);
        setStatus(`启动成功，你的ID: ${event.payload.slice(0, 8)}...`);
        setIsRunning(true);
    });

    // 监听发现节点
    const unlistenPeer = listen('p2p_peer', (event: any) => {
        const peer = event.payload;
        setConnectedPeers(prev => {
            if (prev.includes(peer)) return prev;
            return [...prev, peer];
        });
        setMessages(prev => [...prev, {
            from: 'system',
            content: `发现新节点: ${peer.slice(0, 8)}...`
        }]);
    });

    // 监听收到消息 - 关键修复
    const unlistenMsg = listen('p2p_msg', (event: any) => {
        const msg: ChatMessage = event.payload;
        console.log('[FRONTEND] Received message:', msg);  // 调试日志
        setMessages(prev => [...prev, {
            from: msg.from === '我' ? '我' : msg.from.slice(0, 8),
            content: msg.content
        }]);
    });

    // 监听连接建立
    const unlistenConnected = listen('p2p_connected', (event: any) => {
        const peer = event.payload;
        setConnectedPeers(prev => {
            if (prev.includes(peer)) return prev;
            return [...prev, peer];
        });
        setMessages(prev => [...prev, {
            from: 'system',
            content: `✅ 已连接到: ${peer.slice(0, 8)}...`
        }]);
    });

    checkStatus();

    return () => {
        unlistenReady.then(fn => fn());
        unlistenPeer.then(fn => fn());
        unlistenMsg.then(fn => fn());  // 确保清理
        unlistenConnected.then(fn => fn());
    };
}, []);  // ← 改成空数组，不要依赖 peerId

  const checkStatus = async () => {
    try {
      const running = await invoke<boolean>('p2p_status');
      setIsRunning(running);
      if (running) {
        setStatus('P2P 服务运行中');
      }
    } catch (error) {
      console.error('检查状态失败:', error);
    }
  };

  const handleStart = async () => {
    setStatus('正在启动...');
    try {
      const result = await invoke<string>('start_p2p');
      setStatus(result);
    } catch (error: any) {
      setStatus(`启动失败: ${error}`);
      console.error(error);
    }
  };

  const handleStop = async () => {
    setStatus('正在停止...');
    try {
      const result = await invoke<string>('stop_p2p');
      setStatus(result);
      setIsRunning(false);
      setConnectedPeers([]);
    } catch (error: any) {
      setStatus(`停止失败: ${error}`);
      console.error(error);
    }
  };

  const handleSend = async () => {
    if (!inputMessage.trim()) return;

    // 添加自己的消息到界面
    setMessages(prev => [...prev, {
      from: '我',
      content: inputMessage
    }]);

    try {
      await invoke('send_p2p', { message: inputMessage });
      setInputMessage('');
    } catch (error: any) {
      setMessages(prev => [...prev, {
        from: 'system',
        content: `发送失败: ${error}`
      }]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 to-neutral-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="bg-neutral-900/80 rounded-t-lg border border-red-500/20 border-b-0 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
                P2P 局域网聊天
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                {isRunning ? '● 运行中' : '○ 未启动'}
              </p>
            </div>
            {peerId && (
              <div className="text-right">
                <p className="text-xs text-neutral-500">我的ID</p>
                <p className="text-xs font-mono text-red-400">{peerId.slice(0, 12)}...</p>
              </div>
            )}
          </div>
        </div>

        {/* 控制栏 */}
        <div className="bg-neutral-900/80 border border-red-500/20 p-4">
          <div className="flex gap-3">
            {!isRunning ? (
              <button
                onClick={handleStart}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
              >
                🚀 启动聊天
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
              >
                ⏹️ 停止聊天
              </button>
            )}
          </div>
          
          {status && (
            <div className="mt-3 text-xs text-neutral-400 text-center">
              {status}
            </div>
          )}

          {/* 在线节点 */}
          {connectedPeers.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-neutral-500">在线节点:</span>
              {connectedPeers.map(peer => (
                <span key={peer} className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                  {peer.slice(0, 8)}...
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 消息区域 */}
        <div className="bg-black/30 border border-red-500/20 border-t-0 h-96 overflow-y-auto p-4 space-y-2">
          {messages.length === 0 ? (
            <div className="text-center text-neutral-500 py-10">
              暂无消息，启动聊天后输入文字
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.from === '我' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] px-3 py-2 rounded-lg ${
                    msg.from === '系统' || msg.from === 'system'
                      ? 'bg-neutral-700/50 text-neutral-400 text-xs text-center'
                      : msg.from === '我'
                      ? 'bg-red-600/30 text-neutral-100'
                      : 'bg-neutral-800 text-neutral-100'
                  }`}
                >
                  {msg.from !== '系统' && msg.from !== 'system' && msg.from !== '我' && (
                    <div className="text-xs text-neutral-400 mb-1">{msg.from}</div>
                  )}
                  <div className="text-sm break-words">{msg.content}</div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        {isRunning && (
          <div className="bg-neutral-900/80 rounded-b-lg border border-red-500/20 border-t-0 p-4">
            <div className="flex gap-2">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入消息... (按 Enter 发送)"
                className="flex-1 px-3 py-2 bg-neutral-800 border border-red-500/30 rounded-lg text-neutral-200 text-sm resize-none focus:outline-none focus:border-red-500"
                rows={2}
              />
              <button
                onClick={handleSend}
                disabled={!inputMessage.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white rounded-lg transition"
              >
                发送
              </button>
            </div>
            <div className="text-xs text-neutral-500 mt-2 text-right">
              {connectedPeers.length} 个节点在线
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default P2PChat;