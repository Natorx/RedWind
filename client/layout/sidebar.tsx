import { useActiveItem } from '../context/activeItemContext.tsx';
import avatar from '../mock/pics/avatar.jpg';
import { useSettingDrawer } from '../context/drawerSettingContext.tsx';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from 'react';
interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  order: number;
  source: 'local' | 'server' | 'others';
}

const Sidebar: React.FC = () => {
  const { activeItem, setActiveItem } = useActiveItem();
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { setIsSettingsOpen } = useSettingDrawer();
    // 加载本地配置
    const loadLocalItems = async () => {
      try {
        const sidebarItems = await invoke<SidebarItem[]>('get_sidebar_items');
        setSidebarItems(sidebarItems);
      } catch (error) {
        console.error('加载本地配置失败:', error);
      } finally {
        setLoading(false);
      }
    };
    useEffect(() => {
      loadLocalItems();
    }, []);
  return (
    <aside className="sidebar w-240px bg-#ffffff border-r-1px border-r-solid border-r-#e2e8f0 flex flex-col shadow-sm">
      <div className="sidebar-header py-24px px-20px border-b-1px border-b-solid border-b-#f1f5f9">
        <h2 className="logo text-cyan font-700 font-size-20px mb-1">
          Wind Project
        </h2>
        <p className="logo-subtitle font-size-12px c-#64748b">个人PC助手</p>
      </div>

      {/* 列表 */}
      <nav className="sidebar-nav overflow-y-scroll flex-1 py-4 px-3 scroll-none">
        <ul>
          <li className="mb-2">
            <button
              className={`nav-btn w-full px-4 py-3 border-none bg-transparent rounded-lg flex items-center cursor-pointer text-sm text-slate-500 transition-all duration-200 ease-in-out hover:bg-slate-100 hover:text-slate-700 ${activeItem === 'func-store' ? 'active' : ''}`}
              onClick={() => setActiveItem('func-store')}
            >
              <span className="nav-icon mr-3 font-size-18px">🖥️</span>

              <div className="flex flex-col items-start">
                <span className="nav-label font-500">模块配置</span>
                <span className="text-xs mt-0.5 px-1.5 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  本地提供
                </span>
              </div>
            </button>
          </li>
          {sidebarItems.map((item) => (
            <li className="mb-2" key={item.id}>
              <button
                className={`nav-btn w-full px-4 py-3 border-none bg-transparent rounded-lg flex items-center cursor-pointer text-sm text-slate-500 transition-all duration-200 ease-in-out hover:bg-slate-100 hover:text-slate-700 ${activeItem === item.id ? 'active' : ''}`}
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

      {/* 用户 */}
      <div className="sidebar-footer px-5 py-4 border-t border-gray-200">
        <div
          className="user-card p-3 hover:bg-gray-100 transition-colors rounded-lg cursor-pointer"
          onClick={() => setIsSettingsOpen(true)}
        >
          <div className="user-info flex items-center">
            <div className="user-avatar w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center mr-3 overflow-hidden">
              <img
                src={avatar}
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
    </aside>
  );
};
export default Sidebar;
