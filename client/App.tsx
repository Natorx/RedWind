// App.tsx
import './styles/main.css';
import Sidebar from './layout/sidebar';
import contentMap from './config/contentMap.config';
import { DrawerPage } from './layout/drawer';
import Circle from './layout/circle';
import { MsgContainer, useMsg } from './components/Msg';
import useAppStore from './stores/app';
import { useEffect, useRef } from 'react';

function App() {
  const activeItem = useAppStore((state) => state.activeItem);
  const serverpush = useAppStore((state) => state.serverpush);
  const { showMsg } = useMsg();

  // 使用 ref 存储 showMsg，避免依赖变化导致 useEffect 重复执行
  const showMsgRef = useRef(showMsg);
  showMsgRef.current = showMsg;

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

  return (
    <>
      <div className="app-container flex h-100vh overflow-hidden rounded-xl">
        <Sidebar />
        <main className="main-content scroll-none flex-1 flex flex-col overflow-y-auto">
          <div className="content-wrapper flex-1">
            {contentMap[activeItem] || <div>内容未找到</div>}
          </div>
        </main>
        <DrawerPage />
        <Circle />
      </div>
      <MsgContainer />
    </>
  );
}

export default App;
