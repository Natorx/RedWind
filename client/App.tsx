import { JSX } from 'react';
import './styles/main.css';
import { sidebarItems } from './layout/sidebar/fc_sidebar';
import { useActiveItem } from './context/activeItemContext'; // 新增导入
import APITest from './components/APITest';
import Sidebar from './layout/sidebar/sidebar';

function App() {
  const { activeItem } = useActiveItem();

  // 右侧内容映射
  const contentMap: Record<string, JSX.Element> = {
    dashboard: (
      <div className="content-card">
        <h2>仪表盘</h2>
        <p>这里是您的数据概览...</p>
      </div>
    ),
    projects: (
      <div className="content-card">
        <h2>项目管理</h2>
        <p>查看和管理您的项目...</p>
      </div>
    ),
    analytics: (
      <div className="content-card">
        <h2>数据分析</h2>
        <p>查看详细的分析报告...</p>
      </div>
    ),
    'api-test': <APITest />,
    'api-debug': (
      <div className="content-card">
        <h2>系统设置</h2>
        <p>调整应用设置...</p>
      </div>
    ),

    conversion: (
      <div className="content-card">
        <h2>文件格式转换</h2>
        <p>转换各种文件格式...</p>
      </div>
    ),
    chatbox: (
      <div className="content-card">
        <h2>Chatbox Mini</h2>
        <p>小型聊天机器人界面...</p>
      </div>
    ),
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
    cli: (
      <div className="content-card">
        <h2>命令行调用</h2>
        <p>执行命令行操作...</p>
      </div>
    ),
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
    editor: (
      <div className="content-card">
        <h2>Mini代码编辑器</h2>
        <p>轻量级代码编辑...</p>
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
        <header className="main-header">
          <h1>{sidebarItems.find((item) => item.id === activeItem)?.label}</h1>
          <div className="header-actions">
            <button className="action-btn">🔔</button>
            <button className="action-btn">🔍</button>
          </div>
        </header>

        <div className="content-wrapper">
          {contentMap[activeItem] || <div>内容未找到</div>}

          {/* 仪表盘专用统计卡片 */}
          {activeItem === 'dashboard' && (
            <div className="card-grid">
              <div className="stat-card">
                <h3>今日访问</h3>
                <p className="stat-number">1,248</p>
              </div>
              <div className="stat-card">
                <h3>进行中项目</h3>
                <p className="stat-number">7</p>
              </div>
              <div className="stat-card">
                <h3>完成率</h3>
                <p className="stat-number">85%</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
