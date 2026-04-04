import { useState } from 'react';
import { useActiveItem } from '../../context/activeItemContext'; // 新增
import { sidebarItems } from './sidebar_config';
import Drawer from '../../common/Drawer';

const Sidebar: React.FC = () => {
  const { activeItem, setActiveItem } = useActiveItem();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  return (
    <aside className="sidebar w-240px bg-#ffffff border-r-1px border-r-solid border-r-#e2e8f0 flex flex-col shadow-sm">
      <div className="sidebar-header py-24px px-20px border-b-1px border-b-solid border-b-#f1f5f9">
        <h2 className="logo text-cyan font-700 font-size-20px mb-1">
          Wind Project
        </h2>
        <p className="logo-subtitle font-size-12px c-#64748b">个人PC助手</p>
      </div>

      <nav className="sidebar-nav overflow-y-scroll flex-1 py-4 px-3">
        <ul>
          {sidebarItems.map((item) => (
            <li className="mb-2" key={item.id}>
              <button
                className={`nav-btn w-full px-4 py-3 border-none bg-transparent rounded-lg flex items-center cursor-pointer text-sm text-slate-500 transition-all duration-200 ease-in-out hover:bg-slate-100 hover:text-slate-700 ${activeItem === item.id ? 'active' : ''}`}
                onClick={() => setActiveItem(item.id)}
              >
                {item.icon && <span className="nav-icon mr-3 font-size-18px">{item.icon}</span>}
                <div className="flex flex-col items-start">
                  <span className="nav-label font-500">{item.label}</span>
                  <span
                    className={`text-xs mt-0.5 px-1.5 py-0.5 rounded ${
                      item.source === 'server'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : item.source === 'local'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' // 绿色：本地提供
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' // 黄色：第三方提供
                    }`}
                  >
                    {item.source === 'server'
                      ? '服务端提供'
                      : item.source === 'local'
                        ? '本地提供'
                        : '第三方提供'}
                  </span>
                </div>
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
