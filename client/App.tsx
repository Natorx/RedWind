// App.tsx
import { AnimatePresence, motion, Variants } from 'framer-motion';
import './styles/main.css';
import Sidebar from './layout/sidebar';
import contentMap from './config/contentMap.config';
import { DrawerPage } from './layout/drawer';
import Circle from './layout/circle';
import { MsgContainer, useMsg } from './components/Msg';
import useAppStore, { ChatMessage } from './stores/app';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const pageTransition: Variants = {
  initial: { y: -40, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: 40, opacity: 0 },
};

function App() {
  const activeItem = useAppStore((state) => state.activeItem);
  const serverpush = useAppStore((state) => state.serverpush);
  const username = useAppStore((state) => state.username);
  const addPublicMessage = useAppStore((s) => s.addPublicMessage);
  const addPrivateMessage = useAppStore((s) => s.addPrivateMessage);
  const setPublicMessages = useAppStore((s) => s.setPublicMessages);
  const setSocket = useAppStore((state) => state.setSocket);
  const { showMsg } = useMsg();

  // 新增：获取 msgTips 开关状态（控制聊天消息通知）
  const msgTips = useAppStore((state) => state.msgTips);

  // 使用 ref 存储 showMsg 和 msgTips，避免依赖变化导致 useEffect 重复执行
  const showMsgRef = useRef(showMsg);
  showMsgRef.current = showMsg;
  const msgTipsRef = useRef(msgTips);
  msgTipsRef.current = msgTips;

  const socketRef = useRef<Socket | null>(null);
  const usernameRef = useRef(username);
  usernameRef.current = username;

  // ---------- SSE 连接（保持原有逻辑）----------
  useEffect(() => {
    if (!serverpush) return;
    const eventSource = new EventSource('http://127.0.0.1:3007/notice/sse');
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      showMsgRef.current(data.message, 'info', 3000);
    };
    eventSource.onopen = () => {
      showMsgRef.current('已连接到服务器', 'success', 2000);
    };
    eventSource.onerror = () => {
      console.error('SSE错误');
      showMsgRef.current('连接断开，正在重试...', 'error', 3000);
    };
    return () => eventSource.close();
  }, [serverpush]);

  // ---------- Socket 连接（只在 username 变化时重建）----------
  useEffect(() => {
    if (!username) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socketInstance: Socket = io(import.meta.env.VITE_SERVER_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('Socket connected');
      socketInstance.emit('join', usernameRef.current);
      showMsgRef.current('聊天连接成功', 'success', 2000);
    });

    // 接收历史消息（仅一次，在 join 后触发）
    socketInstance.on('history', (history: ChatMessage[]) => {
      setPublicMessages(history);
    });

    // 实时公共消息
    socketInstance.on('message', (msg: ChatMessage) => {
      addPublicMessage(msg);
      // 根据 msgTips 决定是否显示弹窗通知
      if (msgTipsRef.current) {
        showMsgRef.current(
          msg.username === '系统' ? `📢 ${msg.message}` : `💬 ${msg.username}: ${msg.message}`,
          'info',
          4000
        );
      }
    });

    // 实时私聊消息
    socketInstance.on('privateMessage', (msg: ChatMessage) => {
      addPrivateMessage(msg);
      if (msgTipsRef.current) {
        showMsgRef.current(`🔒 [私聊] ${msg.username}: ${msg.message}`, 'info', 4000);
      }
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Connection error:', err);
      showMsgRef.current('聊天连接失败，请重试', 'error', 5000);
    });

    return () => {
      console.log('Disconnecting socket (username changed or unmount)');
      socketInstance.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
    // 只依赖 username，避免其他状态导致重建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  return (
    <>
      <div className="app-container flex h-100vh overflow-hidden rounded-xl">
        <Sidebar />
        <main className="main-content scroll-none flex-1 flex flex-col overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeItem}
              className="content-wrapper flex-1"
              variants={pageTransition}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
            >
              {contentMap[activeItem] || <div>内容未找到</div>}
            </motion.div>
          </AnimatePresence>
        </main>
        <DrawerPage />
        <Circle />
      </div>
      <MsgContainer />
    </>
  );
}

export default App;
