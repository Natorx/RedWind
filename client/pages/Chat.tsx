// Chat.tsx
import React, { useState, useEffect, useRef, FormEvent } from 'react';
import useAppStore from '../stores/app';

interface ChatMessage {
  username: string;
  message: string;
  timestamp: number;
  type: 'public' | 'private';
  target?: string;
}

interface UserTyping {
  username: string;
  isTyping: boolean;
}

interface FriendRequest {
  from: string;
  to: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: number;
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
          <button onClick={onClose} className="p-1 hover:bg-red-500/20 rounded-md transition-all">
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
  const socket = useAppStore((state) => state.socket);
  const username = useAppStore((state) => state.username);

  // 从全局 Store 读取消息（公共和私聊）
  const publicMessages = useAppStore((state) => state.publicMessages);
  const privateMessagesObj = useAppStore((state) => state.privateMessages);

  const [currentTarget, setCurrentTarget] = useState<string>('大厅');
  const [inputMessage, setInputMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [_, setError] = useState('');
  const [__, setShowIntro] = useState(true);

  const [friendList, setFriendList] = useState<string[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [addFriendInput, setAddFriendInput] = useState('');

  // 系统消息依然本地维护（从 Socket 事件获取），因为需要在抽屉中展示
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
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 3000);
  };

  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // 挂载 Socket 非消息事件监听（用户列表、打字、好友等）
  useEffect(() => {
    if (!socket || !username) return;

    const handleUserList = (users: string[]) => setOnlineUsers(users);
    const handleUserTyping = ({ username: user, isTyping }: UserTyping) => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        if (isTyping) newSet.add(user);
        else newSet.delete(user);
        return newSet;
      });
    };
    const handleError = (errorMsg: string) => {
      setError(errorMsg);
      showToast(errorMsg);
      setTimeout(() => setError(''), 3000);
    };
    const handleFriendList = (friends: string[]) => setFriendList(friends);
    const handleFriendRequests = (requests: FriendRequest[]) => setFriendRequests(requests);
    const handleNewFriendRequest = (request: FriendRequest) => {
      setFriendRequests((prev) => [...prev, request]);
      showToast(`${request.from} 请求添加你为好友`);
    };

    // 仅处理系统消息（用于本地系统抽屉和 toast）
    const handleSystemMessage = (message: ChatMessage) => {
      if (message.username === '系统') {
        setSystemMessages((prev) => [...prev, { text: message.message, timestamp: message.timestamp }]);
        showToast(message.message);
      }
    };

    socket.on('message', handleSystemMessage);
    socket.on('userList', handleUserList);
    socket.on('userTyping', handleUserTyping);
    socket.on('error', handleError);
    socket.on('friendList', handleFriendList);
    socket.on('friendRequests', handleFriendRequests);
    socket.on('newFriendRequest', handleNewFriendRequest);

    // 组件挂载时请求当前状态（仅非消息数据）
    socket.emit('getUsers');
    socket.emit('getFriendList');
    socket.emit('getFriendRequests');

    return () => {
      socket.off('message', handleSystemMessage);
      socket.off('userList', handleUserList);
      socket.off('userTyping', handleUserTyping);
      socket.off('error', handleError);
      socket.off('friendList', handleFriendList);
      socket.off('friendRequests', handleFriendRequests);
      socket.off('newFriendRequest', handleNewFriendRequest);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [socket, username]);

  // 发送消息
  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socket) return;

    if (currentTarget === '大厅') {
      socket.emit('sendMessage', inputMessage.trim());
    } else {
      socket.emit('privateMessage', { target: currentTarget, message: inputMessage.trim() });
    }
    setInputMessage('');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('typing', false);
  };

  // 输入状态（仅公共聊天）
  const handleTyping = () => {
    if (!socket || currentTarget !== '大厅') return;
    socket.emit('typing', true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', false);
    }, 1000);
  };

  // 添加好友
  const handleAddFriend = () => {
    if (!addFriendInput.trim() || !socket) return;
    socket.emit('addFriend', addFriendInput.trim());
    setAddFriendInput('');
  };

  // 处理好友请求
  const handleFriendRequest = (from: string, accepted: boolean) => {
    if (!socket) return;
    socket.emit('handleFriendRequest', { from, accepted });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  // 获取当前会话的消息（从 Store 读取）
  const getCurrentMessages = (): ChatMessage[] => {
    if (currentTarget === '大厅') {
      return publicMessages;
    } else {
      return privateMessagesObj[currentTarget] || [];
    }
  };

  return (
    <div className="flex h-full min-h-screen bg-gradient-to-br from-red-950 to-neutral-900 relative overflow-hidden">
      <ToastMessage message={toastMessage} visible={toastVisible} />
      <SystemDrawer
        isOpen={isSystemDrawerOpen}
        onClose={() => setIsSystemDrawerOpen(false)}
        messages={systemMessages}
        formatTime={formatTime}
      />

      <div className="flex-1 flex flex-col relative z-10">
        {/* 顶部栏 */}
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
              className="cursor-pointer px-2 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-md transition-all border border-neutral-700 hover:border-red-500/50 flex items-center gap-1"
            >
              📋<span className="hidden sm:inline">系统信息</span>
            </button>
          </div>
        </div>

        {/* 聊天消息区域 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {getCurrentMessages().map((msg, index) => (
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

          {currentTarget === '大厅' && Array.from(typingUsers).filter((u) => u !== username).length > 0 && (
            <div className="text-sm text-red-400 italic animate-pulse ml-2">
              {Array.from(typingUsers).filter((u) => u !== username).join(', ')} 正在输入...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 输入框 */}
        <div className="bg-neutral-900/50 backdrop-blur-sm border-t border-red-500/30 p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => {
                setInputMessage(e.target.value);
                handleTyping();
              }}
              placeholder={currentTarget === '大厅' ? '输入消息...' : `私聊 ${currentTarget}...`}
              maxLength={500}
              className="flex-1 px-4 py-2 border-none bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-white placeholder-neutral-500 transition-all"
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

      {/* 右侧面板 */}
      <div className="w-72 bg-neutral-900/70 backdrop-blur-sm border-l border-red-500/30 p-4 relative z-10 h-full overflow-y-auto">
        <h3 className="text-sm font-bold text-neutral-300 mb-4 flex items-center gap-2">
          <span className="text-red-400">💬</span>聊天目标
        </h3>
        <ul className="space-y-1">
          <li
            className={`px-3 py-2 rounded-md text-sm font-medium cursor-pointer flex items-center gap-2 ${
              currentTarget === '大厅'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:border-red-500/30'
            }`}
            onClick={() => setCurrentTarget('大厅')}
          >
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            大厅
          </li>
          {friendList.map((friend) => (
            <li
              key={friend}
              className={`px-3 py-2 rounded-md text-sm font-medium cursor-pointer flex items-center gap-2 ${
                currentTarget === friend
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:border-red-500/30'
              }`}
              onClick={() => setCurrentTarget(friend)}
            >
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              {friend}
            </li>
          ))}
        </ul>
        <div className="mt-2 text-xs text-neutral-600">已连接 {friendList.length + 1} 个频道</div>

        <hr className="my-4 border-red-500/20" />

        <h3 className="text-sm font-bold text-neutral-300 mb-2 flex items-center gap-2">
          <span className="text-green-400">➕</span>添加好友
        </h3>
        <div className="flex gap-1">
          <input
            type="text"
            value={addFriendInput}
            onChange={(e) => setAddFriendInput(e.target.value)}
            placeholder="输入用户名"
            className="flex-1 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-green-500"
          />
          <button
            onClick={handleAddFriend}
            disabled={!addFriendInput.trim()}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm disabled:opacity-50"
          >
            添加
          </button>
        </div>

        {friendRequests.length > 0 && (
          <>
            <hr className="my-4 border-red-500/20" />
            <h3 className="text-sm font-bold text-neutral-300 mb-2 flex items-center gap-2">
              <span className="text-yellow-400">📩</span>
              好友请求{' '}
              <span className="bg-yellow-500 text-black text-xs rounded-full px-1.5 py-0.5">{friendRequests.length}</span>
            </h3>
            <div className="space-y-2">
              {friendRequests.map((req, idx) => (
                <div key={idx} className="bg-neutral-800 rounded p-2 text-sm flex items-center justify-between">
                  <span className="text-neutral-200">{req.from}</span>
                  <div className="flex gap-1">
                    <button onClick={() => handleFriendRequest(req.from, true)} className="px-2 py-0.5 bg-green-600 text-white rounded text-xs">
                      接受
                    </button>
                    <button onClick={() => handleFriendRequest(req.from, false)} className="px-2 py-0.5 bg-red-600 text-white rounded text-xs">
                      拒绝
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <hr className="my-4 border-red-500/20" />
        <h3 className="text-sm font-bold text-neutral-300 mb-2 flex items-center gap-2">
          <span className="text-blue-400">👥</span>在线用户 ({onlineUsers.length})
        </h3>
        <ul className="space-y-1">
          {onlineUsers.map((user) => (
            <li key={user} className="text-sm text-neutral-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              {user} {user === username && <span className="text-xs text-red-400">(我)</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ServerChat;
