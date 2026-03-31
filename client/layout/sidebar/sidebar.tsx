import { useState } from 'react';
import { useActiveItem } from '../../context/activeItemContext'; // 新增
import { sidebarItems } from './fc_sidebar';
import Drawer from '../../common/Drawer';
const Sidebar: React.FC = () => {
  const { activeItem, setActiveItem } = useActiveItem();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2 className="logo text-cyan">Wind Project</h2>
        <p className="logo-subtitle">简约管理平台</p>
      </div>

      <nav className="sidebar-nav overflow-y-scroll">
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

      <div className="sidebar-footer px-5 py-4 border-t border-gray-200">
        <div
          className="user-card p-3 hover:bg-gray-100 transition-colors rounded-lg cursor-pointer"
          onClick={() => setIsSettingsOpen(true)}
        >
          <div className="user-info flex items-center">
            <div className="user-avatar w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center mr-3 overflow-hidden">
              <img
                src="client/mock/pics/avatar.jpg"
                alt="用户头像"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="user-details">
              <p className="user-name font-semibold text-sm">Natorx</p>
              <p className="user-status text-xs text-gray-500">在线</p>
            </div>
            <button
              className="ml-auto p-2  rounded-lg transition-colors border-none cursor-pointer"
              aria-label="打开设置"
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>

      {/* 抽屉 */}
      <Drawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="用户设置"
        position="right"
        width="w-80"
      >
        <div className="space-y-6 p-2">
          {/* 用户信息部分 */}
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-12 h-12 rounded-full overflow-hidden">
              <img
                src="client/mock/pics/avatar.jpg"
                alt="用户头像"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Natorx</h3>
              <p className="text-sm text-gray-500">在线状态</p>
            </div>
          </div>

          {/* 设置选项 */}
          <div className="space-y-2">
            <div className="setting-item p-3 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
              <span className="text-gray-700">个人资料</span>
            </div>
            <div className="setting-item p-3 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
              <span className="text-gray-700">通知设置</span>
            </div>
            <div className="setting-item p-3 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
              <span className="text-gray-700">隐私设置</span>
            </div>
            <div className="setting-item p-3 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
              <span className="text-gray-700">账户安全</span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="pt-4 border-t border-gray-200">
            <button className="w-full py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors border-none cursor-pointer">
              退出登录
            </button>
          </div>
        </div>
      </Drawer>
    </aside>
  );
};
export default Sidebar;
