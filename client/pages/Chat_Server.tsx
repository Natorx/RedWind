import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { io, Socket } from 'socket.io-client';
import { server_chat_addr } from '../config/api.config';
import useAppStore from '../stores/appStore';

interface ChatMessage {
  username: string;
  message: string;
  timestamp: number;
}

interface UserTyping {
  username: string;
  isTyping: boolean;
}

const ToastMessage: React.FC<{ message: string; visible: boolean }> = ({ message, visible }) => {
  return (
    <div
      className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'
      }`}
    >
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg shadow-2xl border border-red-400/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">📢</span>
          <p className="text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
};

const SystemDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  messages: { text: string; timestamp: number }[];
  formatTime: (timestamp: number) => string;
}> = ({ isOpen, onClose, messages, formatTime }) => {
  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-gradient-to-b from-neutral-900 to-red-950 shadow-2xl z-50 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-red-500/30 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-red-500">📋</span>
            系统信息
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-red-500/20 rounded-md transition-all"
          >
            <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-2 overflow-y-auto h-full pb-20">
          {messages.length === 0 ? (
            <p className="text-neutral-500 text-sm text-center mt-8">暂无系统消息</p>
          ) : (
            messages.map((item, idx) => (
              <div key={idx} className="bg-neutral-800/50 border border-red-500/20 rounded-lg p-3 text-sm text-neutral-300">
                <div className="flex justify-between items-start">
                  <span>{item.text}</span>
                  <span className="text-xs text-neutral-500 ml-2 whitespace-nowrap">{formatTime(item.timestamp)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

const ServerChat: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const username = useAppStore((state) => state.username);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [__, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [___, setError] = useState('');
  const [showIntro, setShowIntro] = useState(true);

  const [systemMessages, setSystemMessages] = useState<{ text: string; timestamp: number }[]>([]);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [isSystemDrawerOpen, setIsSystemDrawerOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  };

  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!username) return;

    const socketInstance = io(server_chat_addr, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected');
      setError('');
      socketInstance.emit('join', username);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError('无法连接到聊天服务器');
    });

    socketInstance.on('message', (message: ChatMessage) => {
      if (message.username === '系统') {
        setSystemMessages((prev) => [...prev, { text: message.message, timestamp: message.timestamp }]);
        showToast(message.message);
      } else {
        setMessages((prev) => [...prev, message]);
      }
    });

    socketInstance.on('history', (history: ChatMessage[]) => {
      const sysMessages: { text: string; timestamp: number }[] = [];
      const chatMessages: ChatMessage[] = [];
      history.forEach((msg) => {
        if (msg.username === '系统') {
          sysMessages.push({ text: msg.message, timestamp: msg.timestamp });
        } else {
          chatMessages.push(msg);
        }
      });
      setSystemMessages(sysMessages);
      setMessages(chatMessages);
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
      showToast(errorMsg);
      setTimeout(() => setError(''), 3000);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [username]);

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

  const handleTyping = () => {
    if (!socket) return;
    socket.emit('typing', true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', false);
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-full min-h-screen bg-gradient-to-br from-red-950 to-neutral-900 relative overflow-hidden">
      <div className={`absolute inset-0 pointer-events-none z-20 ${showIntro ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}>
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-scan-top"></div>
        <div className="absolute top-0 right-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-red-500 to-transparent animate-scan-right"></div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-scan-bottom"></div>
        <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-red-500 to-transparent animate-scan-left"></div>
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-red-500/80 rounded-tl-lg animate-pulse-glow"></div>
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-red-500/80 rounded-tr-lg animate-pulse-glow"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-red-500/80 rounded-bl-lg animate-pulse-glow"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-red-500/80 rounded-br-lg animate-pulse-glow"></div>
      </div>

      <ToastMessage message={toastMessage} visible={toastVisible} />
      <SystemDrawer
        isOpen={isSystemDrawerOpen}
        onClose={() => setIsSystemDrawerOpen(false)}
        messages={systemMessages}
        formatTime={formatTime}
      />

      <div className="flex-1 flex flex-col relative z-10">
        <div className="bg-neutral-900/50 backdrop-blur-sm border-b border-red-500/30 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-xs font-bold shadow-md">
              {username ? username.charAt(0).toUpperCase() : '?'}
            </div>
            <span className="text-sm font-semibold text-neutral-200">{username || '未设置'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSystemDrawerOpen(true)}
              className="px-2 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-md transition-all border border-neutral-700 hover:border-red-500/50 flex items-center gap-1"
            >
              📋
              <span className="hidden sm:inline">系统</span>
            </button>
            <button
              onClick={() => {
                if (socket) {
                  socket.disconnect();
                  setSocket(null);
                }
              }}
              className="px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-md transition-all border border-red-500/50 hover:border-red-500"
            >
              断开连接
            </button>
          </div>
        </div>

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
                    : 'bg-neutral-800/80 text-neutral-200 border border-neutral-700'
                }`}
              >
                {msg.username !== username && (
                  <div className="text-xs font-bold text-red-400 mb-1">{msg.username}</div>
                )}
                <div className="break-words text-sm">{msg.message}</div>
                <div className={`text-xs mt-1 ${msg.username === username ? 'text-red-200' : 'text-neutral-500'}`}>
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          ))}

          {Array.from(typingUsers).filter(u => u !== username).length > 0 && (
            <div className="text-sm text-red-400 italic animate-pulse ml-2">
              {Array.from(typingUsers).filter(u => u !== username).join(', ')} 正在输入...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

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
          <div className="mt-2 text-xs text-neutral-600 text-right">按 Enter 发送，最多 500 字符</div>
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
