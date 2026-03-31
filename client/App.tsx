import { JSX, useState } from 'react';
import './styles/main.css';
import APITest from './components/APITest';

// 侧边栏项目类型
interface SidebarItem {
  id: string;
  label: string;
  icon?: string;
}

// 定义侧边栏项目（添加 API 测试）
const sidebarItems: SidebarItem[] = [
  { id: 'dashboard', label: '仪表盘', icon: '📊' },
  { id: 'projects', label: '项目', icon: '📁' },
  { id: 'analytics', label: '分析', icon: '📈' },
  { id: 'api-test', label: 'API 测试', icon: '🔧' }, // 新增
  { id: 'settings', label: '设置', icon: '⚙️' },
  { id: 'help', label: '帮助', icon: '❓' },
];

function App() {
  const [activeItem, setActiveItem] = useState<string>('dashboard');

  // 右侧内容映射（添加 API 测试）
  const contentMap: Record<string, JSX.Element> = {
    dashboard: <div className="content-card"><h2>仪表盘</h2><p>这里是您的数据概览...</p></div>,
    projects: <div className="content-card"><h2>项目管理</h2><p>查看和管理您的项目...</p></div>,
    analytics: <div className="content-card"><h2>数据分析</h2><p>查看详细的分析报告...</p></div>,
    'api-test': <APITest />, // 新增
    settings: <div className="content-card"><h2>系统设置</h2><p>调整应用设置...</p></div>,
    help: <div className="content-card"><h2>帮助中心</h2><p>获取使用帮助...</p></div>,
  };

  return (
    <div className="app-container">
      {/* 左侧侧边栏 */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2 className="logo">Wind Project</h2>
          <p className="logo-subtitle">简约管理平台</p>
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            {sidebarItems.map((item) => (
              <li key={item.id}>
                <button
                  className={`nav-btn ${activeItem === item.id ? 'active' : ''}`}
                  onClick={() => setActiveItem(item.id)}
                >
                  {item.icon && <span className="nav-icon">{item.icon}</span>}
                  <span className="nav-label">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">👤</div>
            <div className="user-details">
              <p className="user-name">Natorx</p>
              <p className="user-status">在线</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 右侧主内容区 */}
      <main className="main-content">
        <header className="main-header">
          <h1>{sidebarItems.find(item => item.id === activeItem)?.label}</h1>
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
