import { JSX } from 'react';
import './styles/main.css';
import { useActiveItem } from './context/activeItemContext'; // 新增导入
import Sidebar from './layout/sidebar/sidebar';
import Terminal from './pages/Terminal';
import AIChat from './pages/AIchat';
import RequestTool from './pages/RequestTool';
import Dashboard from './pages/Dashboard';
import Printer from './pages/Printer';
import DrillGround from './pages/DrillGround';
import SysInfo from './pages/SysInfo';
import TypingPractice from './pages/English';
import Recorder from './pages/Recorder';
import Heatmap from './pages/Heatmap';
import { mockData_heatMap } from './mock/heatmap.mock';
import QRCodeGenerator from './pages/QRCodeGenerator';

function App() {
  const { activeItem } = useActiveItem();

  // 右侧内容映射
  const contentMap: Record<string, JSX.Element> = {
    'dashboard': <Dashboard />,
    'analytics': (
      <div className="content-card bg-white rounded-md p-24px shadow-sm mb-24px border-1px border-solid border-#f1f5f9">
        <h2>数据分析</h2>
        <p className="c-#64748b lh-3">查看详细的分析报告...</p>
      </div>
    ),
    'api-debug': <RequestTool />,

    'conversion': (
      <div className="content-card bg-white rounded-md p-24px shadow-sm mb-24px border-1px border-solid border-#f1f5f9">
        <h2>文件格式转换</h2>
        <p className="c-#64748b lh-3">转换各种文件格式...</p>
      </div>
    ),
    'chatbox': <AIChat />,
    'web-scraper': (
      <div className="content-card bg-white rounded-md p-24px shadow-sm mb-24px border-1px border-solid border-#f1f5f9">
        <h2>网页解构</h2>
        <p className="c-#64748b lh-3">提取和分析网页内容...</p>
      </div>
    ),
    'encryption': (
      <div className="content-card bg-white rounded-md p-24px shadow-sm mb-24px border-1px border-solid border-#f1f5f9">
        <h2>加密算法</h2>
        <p className="c-#64748b lh-3">使用各种加密算法...</p>
      </div>
    ),
    cli: <Terminal />,
    'debug': (
      <div className="content-card bg-white rounded-md p-24px shadow-sm mb-24px border-1px border-solid border-#f1f5f9">
        <h2 className="font-20px mb-12px c-#0f172a">调试环境配置</h2>
        <p className="c-#64748b lh-3">配置调试环境...</p>
      </div>
    ),
    'docs': (
      <div className="content-card bg-white rounded-md p-24px shadow-sm mb-24px border-1px border-solid border-#f1f5f9">
        <h2 className="font-20px mb-12px c-#0f172a">层级结构文档</h2>
        <p className="c-#64748b lh-3">查看项目文档结构...</p>
      </div>
    ),
    'hardware': <div>硬件配置查看</div>,
    'file-explorer': (
      <div className="content-card bg-white rounded-md p-24px shadow-sm mb-24px border-1px border-solid border-#f1f5f9">
        <h2 className="font-20px mb-12px c-#0f172a">路径镜像</h2>
        <p className="c-#64748b lh-3">浏览和管理文件路径...</p>
      </div>
    ),
    'network-devices': (
      <div className="content-card bg-white rounded-md p-24px shadow-sm mb-24px border-1px border-solid border-#f1f5f9">
        <h2 className="font-20px mb-12px c-#0f172a">网络设备调用</h2>
        <p className="c-#64748b lh-3">管理和调用网络设备...</p>
      </div>
    ),
    'process-manager': <SysInfo />,
    'music-player': (
      <div className="content-card bg-white rounded-md p-24px shadow-sm mb-24px border-1px border-solid border-#f1f5f9">
        <h2 className="font-20px mb-12px c-#0f172a">音乐播放器</h2>
        <p className="c-#64748b lh-3">播放和管理音乐文件...</p>
      </div>
    ),
    'remote-desktop': (
      <div className="content-card bg-white rounded-md p-24px shadow-sm mb-24px border-1px border-solid border-#f1f5f9">
        <h2 className="font-20px mb-12px c-#0f172a">桌面远程控制</h2>
        <p className="c-#64748b lh-3">远程控制桌面...</p>
      </div>
    ),
    'app-launcher': (
      <div className="content-card bg-white rounded-md p-24px shadow-sm mb-24px border-1px border-solid border-#f1f5f9">
        <h2>应用管理启动</h2>
        <p className="c-#64748b lh-3">管理和启动应用程序...</p>
      </div>
    ),
    'email': (
      <div className="content-card bg-white rounded-md p-24px shadow-sm mb-24px border-1px border-solid border-#f1f5f9">
        <h2 className="font-20px mb-12px c-#0f172a">基础邮件收发</h2>
        <p className="c-#64748b lh-3">发送和接收邮件...</p>
      </div>
    ),
    'qr-code': (
      <div className="content-card bg-white rounded-md p-24px shadow-sm mb-24px border-1px border-solid border-#f1f5f9">
        <h2 className="font-20px mb-12px c-#0f172a">二维码生成调用</h2>
        <p className="c-#64748b lh-3">生成和扫描二维码...</p>
      </div>
    ),
    'typing-practice': <TypingPractice />,
    'file-sharing': (
      <div className="content-card bg-white rounded-md p-24px shadow-sm mb-24px border-1px border-solid border-#f1f5f9">
        <h2 className="font-20px mb-12px c-#0f172a">文件共享</h2>
        <p className="c-#64748b lh-3">共享文件给其他用户...</p>
      </div>
    ),
    'multi-device-login': (
      <div className="content-card bg-white rounded-md p-24px shadow-sm mb-24px border-1px border-solid border-#f1f5f9">
        <h2 className="font-20px mb-12px c-#0f172a">多设备登录</h2>
        <p className="c-#64748b lh-3">管理多设备登录...</p>
      </div>
    ),
    'plugins': (
      <div className="content-card bg-white rounded-md p-24px shadow-sm mb-24px border-1px border-solid border-#f1f5f9">
        <h2 className="font-20px mb-12px c-#0f172a">插件扩展</h2>
        <p className="c-#64748b lh-3">管理和扩展插件...</p>
      </div>
    ),
    'printer': <Printer />,
    'drill-ground': <DrillGround />,
    'heatmap': <Heatmap data={mockData_heatMap} />,
    'recorder': <Recorder />,
    'qrcode':<QRCodeGenerator/>
  };

  return (
    <div className="app-container flex h-100vh overflow-hidden">
      {/* 左侧侧边栏 */}
      <Sidebar />

      {/* 右侧主内容区 */}
      <main className="main-content flex-1 flex flex-col overflow-y-auto">
        <div className="content-wrapper flex-1">
          {contentMap[activeItem] || <div>内容未找到</div>}
        </div>
      </main>
    </div>
  );
}

export default App;
