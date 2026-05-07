import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { io, Socket } from 'socket.io-client';
import { server_chat_addr } from '../config/api.config';
import useAppStore from '../stores/appStore';

// 消息类型定义
interface ChatMessage {
  username: string;
  message: string;
  timestamp: number;
}

interface UserTyping {
  username: string;
  isTyping: boolean;
}

const ServerChat: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const username = useAppStore((state) => state.username); // 直接从 store 获取
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [_, setError] = useState('');
  const [showIntro, setShowIntro] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 3秒后隐藏边缘特效
  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // 连接 Socket（不再需要用户手动输入用户名，直接使用 store 中的 username）
  useEffect(() => {
    if (!username) return; // 如果没有 username，则等待（可根据业务决定是否兜底）

    const socketInstance = io(server_chat_addr, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected');
      setError('');
      // 连接成功后自动加入聊天室
      socketInstance.emit('join', username);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError('无法连接到聊天服务器');
    });

    socketInstance.on('message', (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    socketInstance.on('history', (history: ChatMessage[]) => {
      setMessages(history);
    });

    socketInstance.on('userList', (users: string[]) => {
      setOnlineUsers(users);
    });

    socketInstance.on('userTyping', ({ username, isTyping }: UserTyping) => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        if (isTyping) {
          newSet.add(username);
        } else {
          newSet.delete(username);
        }
        return newSet;
      });
    });

    socketInstance.on('error', (errorMsg: string) => {
      setError(errorMsg);
      setTimeout(() => setError(''), 3000);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [username]); // 依赖 username，当 username 变化时重新连接

  // 发送消息
  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socket) return;

    socket.emit('sendMessage', inputMessage.trim());
    setInputMessage('');

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.emit('typing', false);
  };

  // 处理输入
  const handleTyping = () => {
    if (!socket) return;

    socket.emit('typing', true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', false);
    }, 1000);
  };

  // 清理连接
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []); // 仅组件卸载时清理

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  // 直接显示聊天界面（不再需要未加入状态）
  return (
    <div className="flex h-full min-h-screen bg-gradient-to-br from-red-950 to-neutral-900 relative overflow-hidden">
      {/* 边缘特效 */}
      <div className={`
        absolute inset-0 pointer-events-none z-20
        ${showIntro ? 'opacity-100' : 'opacity-0'}
        transition-opacity duration-500
      `}>
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-scan-top"></div>
        <div className="absolute top-0 right-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-red-500 to-transparent animate-scan-right"></div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-scan-bottom"></div>
        <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-red-500 to-transparent animate-scan-left"></div>

        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-red-500/80 rounded-tl-lg animate-pulse-glow"></div>
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-red-500/80 rounded-tr-lg animate-pulse-glow"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-red-500/80 rounded-bl-lg animate-pulse-glow"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-red-500/80 rounded-br-lg animate-pulse-glow"></div>
      </div>

      {/* 侧边栏 - 在线用户列表 */}
      <div className="w-64 bg-neutral-900/80 backdrop-blur-sm border-r border-red-500/30 flex flex-col relative z-10">
        <div className="p-4 border-b border-red-500/30">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-transparent bg-gradient-to-r from-red-500 to-red-700 bg-clip-text">
              在线用户
            </h2>
            <span className="text-xs text-red-400">{onlineUsers.length} 人</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {onlineUsers.map((user, index) => (
            <div key={index} className="flex items-center py-2 px-2 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 transition-all group">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-xs font-bold shadow-lg">
                {user.charAt(0).toUpperCase()}
              </div>
              <span className="ml-3 text-neutral-300 text-sm flex-1">
                {user}
                {user === username && <span className="text-red-500 text-xs ml-1">(我)</span>}
              </span>
              {typingUsers.has(user) && user !== username && (
                <span className="text-xs text-red-400 animate-pulse">输入中...</span>
              )}
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-red-500/30">
          <button
            onClick={() => {
              if (socket) {
                socket.disconnect();
                setSocket(null);
              }
              // 也可在此清除 store 中的 username 或进行其他操作
            }}
            className="w-full px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all text-sm border border-red-500/50 hover:border-red-500"
          >
            断开连接
          </button>
        </div>
      </div>

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col relative z-10">
        <div className="bg-neutral-900/50 backdrop-blur-sm border-b border-red-500/30 px-6 py-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
              公共聊天室
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 leading-normal">
              已自动加入
            </span>
          </div>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.username === username ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className={`max-w-md px-4 py-2 rounded-lg shadow-lg ${
                  msg.username === username
                    ? 'bg-gradient-to-r from-red-500 to-red-700 text-white'
                    : msg.username === '系统'
                      ? 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                      : 'bg-neutral-800/80 text-neutral-200 border border-neutral-700'
                }`}
              >
                {msg.username !== username && msg.username !== '系统' && (
                  <div className="text-xs font-bold text-red-400 mb-1">
                    {msg.username}
                  </div>
                )}
                <div className="break-words text-sm">{msg.message}</div>
                <div className={`text-xs mt-1 ${
                  msg.username === username ? 'text-red-200' : 'text-neutral-500'
                }`}>
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          ))}

          {/* 正在输入提示 */}
          {Array.from(typingUsers).filter(u => u !== username).length > 0 && (
            <div className="text-sm text-red-400 italic animate-pulse ml-2">
              {Array.from(typingUsers).filter(u => u !== username).join(', ')} 正在输入...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div className="bg-neutral-900/50 backdrop-blur-sm border-t border-red-500/30 p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => {
                setInputMessage(e.target.value);
                handleTyping();
              }}
              placeholder="输入消息..."
              maxLength={500}
              className="flex-1 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-white placeholder-neutral-500 transition-all"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-700 text-white rounded-lg hover:from-red-600 hover:to-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-red-500/25"
            >
              发送
            </button>
          </form>
          <div className="mt-2 text-xs text-neutral-600 text-right">
            按 Enter 发送，最多 500 字符
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan-top {
          0% { transform: translateX(-100%); opacity: 0; }
          50% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        @keyframes scan-right {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        @keyframes scan-bottom {
          0% { transform: translateX(100%); opacity: 0; }
          50% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(-100%); opacity: 0; }
        }
        @keyframes scan-left {
          0% { transform: translateY(100%); opacity: 0; }
          50% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-100%); opacity: 0; }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; box-shadow: 0 0 0px rgba(239, 68, 68, 0); }
          50% { opacity: 1; box-shadow: 0 0 20px rgba(239, 68, 68, 0.8); }
        }
        .animate-scan-top { animation: scan-top 1.25s ease-in-out infinite; }
        .animate-scan-right { animation: scan-right 1.25s ease-in-out infinite; }
        .animate-scan-bottom { animation: scan-bottom 1.25s ease-in-out infinite; }
        .animate-scan-left { animation: scan-left 1.25s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 1.25s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default ServerChat;
