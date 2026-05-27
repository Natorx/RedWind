// sidebar.tsx
import { useActiveItem } from '../context/activeItemContext.tsx';
import { useSettingDrawer } from '../context/drawerSettingContext.tsx';
import { useEffect, useState } from 'react';
import { sourceConfig } from '../config/module.config.ts';
import { useModuleStore } from '../stores/module.ts';
import { useUiStore } from '../stores/ui.ts';
import { useAccountStore } from '../stores/account.ts'; // 替换为 account store
import iconSrc from '../assets/icon.png';
import avatar from '../mock/pics/avatar.jpg';

const Sidebar: React.FC = () => {
  const { sidebarItems, loadItems } = useModuleStore();
  const { activeItem, setActiveItem } = useActiveItem();
  const { setIsSettingsOpen } = useSettingDrawer();
  const [showSidebar, setShowSidebar] = useState(false);
  const activeUi = useUiStore((state) => state.activeUi);

  // 从 account store 获取用户信息
  const { user, isLoggedIn } = useAccountStore();

  useEffect(() => {
    setShowSidebar(activeUi === 'sidebar');
  }, [activeUi]);

  useEffect(() => {
    loadItems();
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
          <li className="mb-2">
            <button
              className={` w-full px-4 py-3 border-none rounded-lg flex items-center cursor-pointer text-sm transition-all duration-200 ease-in-out ${
                activeItem === 'module-config'
                  ? 'bg-red-900 text-white'
                  : 'bg-transparent text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
              }`}
              onClick={() => setActiveItem('module-config')}
            >
              <span className="nav-icon mr-3 font-size-18px">🖥️</span>

              <div className="flex flex-col items-start">
                <span className="nav-label font-500">模块配置</span>
                <span className="text-xs mt-0.5 px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                  本地提供
                </span>
              </div>
            </button>
          </li>
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
                  <span
                    className={`text-xs mt-0.5 px-1.5 py-0.5 rounded`}
                  >
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
          onClick={() => setIsSettingsOpen(true)}
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
