import { JSX } from 'react';
import './styles/main.css';
import { useActiveItem } from './context/activeItemContext'; // 新增导入
import Sidebar from './layout/sidebar/sidebar';
import Terminal from './components/Terminal';
import AIChat from './components/AIchat';
import RequestTool from './components/RequestTool';
import Dashboard from './components/Dashboard';

function App() {
  const { activeItem } = useActiveItem();

  // 右侧内容映射
  const contentMap: Record<string, JSX.Element> = {
    dashboard: <Dashboard/>,
    analytics: (
      <div className="content-card">
        <h2>数据分析</h2>
        <p>查看详细的分析报告...</p>
      </div>
    ),
    'api-debug': <RequestTool/>,

    conversion: (
      <div className="content-card">
        <h2>文件格式转换</h2>
        <p>转换各种文件格式...</p>
      </div>
    ),
    chatbox:<AIChat/>,
    'web-scraper': (
      <div className="content-card">
        <h2>网页解构</h2>
        <p>提取和分析网页内容...</p>
      </div>
    ),
    encryption: (
      <div className="content-card">
        <h2>加密算法</h2>
        <p>使用各种加密算法...</p>
      </div>
    ),
    cli: <Terminal />,
    debug: (
      <div className="content-card">
        <h2>调试环境配置</h2>
        <p>配置调试环境...</p>
      </div>
    ),
    docs: (
      <div className="content-card">
        <h2>层级结构文档</h2>
        <p>查看项目文档结构...</p>
      </div>
    ),
    hardware: (
      <div className="content-card">
        <h2>硬件配置读取</h2>
        <p>读取系统硬件信息...</p>
      </div>
    ),
    'file-explorer': (
      <div className="content-card">
        <h2>路径镜像</h2>
        <p>浏览和管理文件路径...</p>
      </div>
    ),
    'network-devices': (
      <div className="content-card">
        <h2>网络设备调用</h2>
        <p>管理和调用网络设备...</p>
      </div>
    ),
    'process-manager': (
      <div className="content-card">
        <h2>进程调度查看</h2>
        <p>查看和管理系统进程...</p>
      </div>
    ),
    'music-player': (
      <div className="content-card">
        <h2>音乐播放器</h2>
        <p>播放和管理音乐文件...</p>
      </div>
    ),
    'remote-desktop': (
      <div className="content-card">
        <h2>桌面远程控制</h2>
        <p>远程控制桌面...</p>
      </div>
    ),
    'app-launcher': (
      <div className="content-card">
        <h2>应用管理启动</h2>
        <p>管理和启动应用程序...</p>
      </div>
    ),
    email: (
      <div className="content-card">
        <h2>基础邮件收发</h2>
        <p>发送和接收邮件...</p>
      </div>
    ),
    'qr-code': (
      <div className="content-card">
        <h2>二维码生成调用</h2>
        <p>生成和扫描二维码...</p>
      </div>
    ),
    'typing-practice': (
      <div className="content-card">
        <h2>英语打字练习</h2>
        <p>练习英语打字...</p>
      </div>
    ),
    'file-sharing': (
      <div className="content-card">
        <h2>文件共享</h2>
        <p>共享文件给其他用户...</p>
      </div>
    ),
    'multi-device-login': (
      <div className="content-card">
        <h2>多设备登录</h2>
        <p>管理多设备登录...</p>
      </div>
    ),
    plugins: (
      <div className="content-card">
        <h2>插件扩展</h2>
        <p>管理和扩展插件...</p>
      </div>
    ),
  };

  return (
    <div className="app-container">
      {/* 左侧侧边栏 */}
      <Sidebar />

      {/* 右侧主内容区 */}
      <main className="main-content">
        <div className="content-wrapper">
          {contentMap[activeItem] || <div>内容未找到</div>}
        </div>
      </main>
    </div>
  );
}

export default App;
