import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { io, Socket } from 'socket.io-client';

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
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 连接 Socket.io
  const connectSocket = () => {
    const socketInstance = io('http://localhost:3006', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected');
      setError('');
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError('无法连接到聊天服务器');
      setIsConnecting(false);
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
    return socketInstance;
  };

  // 加入聊天室
  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsConnecting(true);
    const newSocket = connectSocket();
    
    // 等待连接成功后发送 join 事件
    newSocket.once('connect', () => {
      newSocket.emit('join', username.trim());
      setIsJoined(true);
      setIsConnecting(false);
    });
  };

  // 发送消息
  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socket) return;

    socket.emit('sendMessage', inputMessage.trim());
    setInputMessage('');
    
    // 停止输入状态
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.emit('typing', false);
  };

  // 处理输入（发送正在输入状态）
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

  // 退出聊天
  const handleLeave = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setIsJoined(false);
    setUsername('');
    setMessages([]);
    setOnlineUsers([]);
    setTypingUsers(new Set());
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
  }, [socket]);

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  // 未加入聊天室的状态
  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-96">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">💬</div>
            <h1 className="text-2xl font-bold text-gray-800">加入聊天室</h1>
            <p className="text-gray-500 mt-2">输入用户名开始聊天</p>
          </div>
          
          <form onSubmit={handleJoin}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              maxLength={20}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isConnecting}
            />
            {error && (
              <div className="mt-2 text-red-500 text-sm text-center">{error}</div>
            )}
            <button
              type="submit"
              disabled={!username.trim() || isConnecting}
              className="w-full mt-4 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {isConnecting ? '连接中...' : '进入聊天室'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 聊天界面
  return (
    <div className="h-screen flex bg-gray-100">
      {/* 侧边栏 - 在线用户列表 */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">在线用户</h2>
            <span className="text-sm text-gray-500">{onlineUsers.length} 人</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {onlineUsers.map((user, index) => (
            <div key={index} className="flex items-center py-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {user.charAt(0).toUpperCase()}
              </div>
              <span className="ml-3 text-gray-700">
                {user}
                {user === username && <span className="text-gray-400 text-sm ml-1">(我)</span>}
              </span>
              {typingUsers.has(user) && user !== username && (
                <span className="ml-2 text-xs text-gray-400 animate-pulse">正在输入...</span>
              )}
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLeave}
            className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
          >
            退出聊天室
          </button>
        </div>
      </div>

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col">
        {/* 聊天头部 */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-800">公共聊天室</h1>
          <p className="text-sm text-gray-500">已加入，开始聊天吧</p>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.username === username ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-md ${msg.username === username
                      ? 'bg-blue-500 text-white'
                      : msg.username === '系统'
                        ? 'bg-gray-300 text-gray-700'
                        : 'bg-white text-gray-800'
                    } rounded-lg px-4 py-2 shadow`}
                >
                  {msg.username !== username && (
                    <div className="text-xs font-semibold mb-1 opacity-75">
                      {msg.username}
                    </div>
                  )}
                  <div className="break-words">{msg.message}</div>
                  <div
                    className={`text-xs mt-1 ${msg.username === username ? 'text-blue-100' : 'text-gray-400'
                      }`}
                  >
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            
            {/* 正在输入提示 */}
            {Array.from(typingUsers).filter(u => u !== username).length > 0 && (
              <div className="text-sm text-gray-400 italic ml-2">
                {Array.from(typingUsers).filter(u => u !== username).join(', ')} 正在输入...
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 输入区域 */}
        <div className="bg-white border-t border-gray-200 p-4">
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
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              发送
            </button>
          </form>
          <div className="mt-2 text-xs text-gray-400 text-right">
            按 Enter 发送，最多 500 字符
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerChat;