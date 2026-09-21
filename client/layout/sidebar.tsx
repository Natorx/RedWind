// sidebar.tsx —— 固定侧栏：只渲染 sidebar.config.ts 中定义的模块，不再从数据库动态加载
import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { sourceConfig } from '../config/module.config.ts';
import sidebarItems, { REMOVED_MODULE_IDS } from '../config/sidebar.config.ts';
import { useUiStore } from '../stores/ui.ts';
import { useAccountStore } from '../stores/account.ts';
import iconSrc from '../assets/icon.png';
import avatar from '../assets/avatar.jpg';
import useAppStore from '../stores/app.ts';

const Sidebar: React.FC = () => {
  const activeItem = useAppStore((state) => state.activeItem);
  const setActiveItem = useAppStore((state) => state.setActiveItem);
  const setSettingOpen = useAppStore((state) => state.setSettingOpen);
  const activeUi = useUiStore((state) => state.activeUi);

  const { user, isLoggedIn } = useAccountStore();

  const showSidebar = activeUi === 'sidebar';

  // 一次性清理历史数据库中已下线模块的残留记录（失败静默，不影响界面）
  useEffect(() => {
    REMOVED_MODULE_IDS.forEach((id) => {
      invoke('delete_sidebar_item', { id }).catch(() => {
        /* 记录本就不存在时忽略 */
      });
    });
  }, []);

  if (!showSidebar) return null;

  return (
    <aside className="sidebar w-240px bg-gradient-to-br from-red-950/95 to-neutral-900/95 backdrop-blur-sm border-r-1px border-r-solid border-r-red-500/20 flex flex-col shadow-lg animate-drawer-out">
      <div className="sidebar-header flex items-center py-24px px-20px border-b-1px border-b-solid border-b-red-500/20">
        <img className="w-10 h-10" src={iconSrc} alt="" />
        <h2 className="logo bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent font-700 font-size-20px mb-1">
          Red Wind
        </h2>
      </div>

      {/* 列表 */}
      <nav className="sidebar-nav overflow-y-scroll flex-1 py-4 px-3 scroll-none">
        <ul>
          {sidebarItems.map((item) => (
            <li className="mb-2" key={item.id}>
              <button
                className={` w-full px-4 py-3 border-none rounded-lg flex items-center cursor-pointer text-sm transition-all duration-200 ease-in-out ${
                  activeItem === item.id
                    ? 'bg-red-900 text-white'
                    : 'bg-transparent text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
                }`}
                onClick={() => setActiveItem(item.id)}
              >
                {item.icon && (
                  <span className="nav-icon mr-3 font-size-18px">
                    {item.icon}
                  </span>
                )}
                <div className="flex flex-col items-start">
                  <span className="nav-label font-500">{item.label}</span>
                  <span className={`text-xs mt-0.5 px-1.5 py-0.5 rounded`}>
                    {sourceConfig[item.source].label}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* 用户 */}
      <div className="sidebar-footer px-5 py-4 border-t border-red-500/20">
        <div
          className="user-card p-3 hover:bg-neutral-800/50 transition-all rounded-lg cursor-pointer"
          onClick={() => setSettingOpen(true)}
        >
          <div className="user-info flex items-center">
            <div className="user-avatar w-9 h-9 bg-gradient-to-br from-red-500/20 to-red-700/20 rounded-full flex items-center justify-center mr-3 overflow-hidden">
              <img
                src={avatar}
                alt="用户头像"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="user-details">
              {/* 用户名：已登录显示账号用户名，未登录显示“游客” */}
              <p className="user-name font-semibold text-sm text-neutral-200">
                {isLoggedIn ? user?.username : '游客'}
              </p>
            </div>
            <button
              className="ml-auto py-1 px-2 rounded-lg transition-colors border-none cursor-pointer text-neutral-200  hover:bg-red-800 bg-red-600"
              aria-label="打开设置"
            >
              设置
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
