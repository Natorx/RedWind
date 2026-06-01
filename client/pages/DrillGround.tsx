// DrillGround.tsx
import { useEffect } from 'react';
import PageBox from "../components/PageBox";
import { useMsg } from '../components/Msg';

const DrillGround: React.FC = () => {
  const { showMsg } = useMsg();

  useEffect(() => {
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
  }, [showMsg]);

  return (
    <PageBox>
      <div style={{ padding: '20px', fontSize: '24px', textAlign: 'center' }}>
        SSE 实时推送演示
        <div style={{ fontSize: '14px', marginTop: '10px', color: '#666' }}>
          每分钟会收到一次推送
        </div>
      </div>
    </PageBox>
  );
};

export default DrillGround;