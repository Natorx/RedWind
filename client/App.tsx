import { AnimatePresence, motion, Variants } from 'framer-motion';
import './styles/main.css';
import Sidebar from './layout/sidebar';
import contentMap from './config/contentMap.config';
import { DrawerPage } from './layout/drawer';
import Circle from './layout/circle';
import { MsgContainer, useMsg } from './components/Msg';
import useAppStore from './stores/app';
import { useEffect } from 'react';

// 定义切换动画
const pageTransition: Variants = {
  initial: { y: -40, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: 40, opacity: 0 },
};

function App() {
  const activeItem = useAppStore((state) => state.activeItem);
  const serverpush = useAppStore((state) => state.serverpush);
  const { showMsg } = useMsg();

  useEffect(() => {
    // 只有在 serverpush 为 true 时才连接 SSE
    if (!serverpush) {
      return;
    }

    // 连接 SSE
    const eventSource = new EventSource('http://127.0.0.1:3007/notice/sse');

    // 接收消息
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // 使用通知组件显示消息
      showMsg(data.message, 'info', 3000);
    };

    // 连接成功
    eventSource.onopen = () => {
      showMsg('已连接到服务器', 'success', 2000);
    };

    // 错误处理
    eventSource.onerror = (error) => {
      console.error('SSE错误:', error);
      showMsg('连接断开，正在重试...', 'error', 3000);
    };

    // 清理连接
    return () => {
      eventSource.close();
    };
  }, [serverpush, showMsg]);

  return (
    <>
      <div className="app-container flex h-100vh overflow-hidden rounded-xl">
        {/* 左侧侧边栏 */}
        <Sidebar />
        {/* 右侧主内容区 */}
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
      {/* 渲染消息容器（右下角） */}
      <MsgContainer />
    </>
  );
}

export default App;
