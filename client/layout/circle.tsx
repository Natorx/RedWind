// circle.tsx
import React, { useState, useEffect } from 'react';
import { visibility } from '../utils/visible';
import { useActiveItem } from '../context/activeItemContext';
import { invoke } from '@tauri-apps/api/core';
import iconSrc from '../assets/icon.png';
import { useSettingDrawer } from '../context/drawerSettingContext';

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  order: number;
  source: 'local' | 'server' | 'others';
}

const Circle: React.FC = () => {
  const [showCircle, setShowCircle] = useState(visibility.getShowCircle());
  const [isExpanded, setIsExpanded] = useState(false);
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>([]);
  const { activeItem, setActiveItem } = useActiveItem();
  const { setIsSettingsOpen } = useSettingDrawer();

  useEffect(() => {
    const unsubscribe = visibility.subscribe((_, newShowCircle) => {
      setShowCircle(newShowCircle);
      if (!newShowCircle) {
        setIsExpanded(false);
      }
    });
    return unsubscribe;
  }, []);

  // 加载侧边栏项
  useEffect(() => {
    const loadItems = async () => {
      try {
        const items = await invoke<SidebarItem[]>('get_sidebar_items');
        setSidebarItems(items);
      } catch (error) {
        console.error('加载配置失败:', error);
      }
    };
    loadItems();
  }, []);

  if (!showCircle) return null;

  const handleCircleClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleItemClick = (itemId: string) => {
    setActiveItem(itemId);
    setIsExpanded(false);
  };

  // 所有菜单项（包括固定项和动态项）
  const allMenuItems = [
    {
      id: 'func-store',
      label: '模块配置',
      icon: '🖥️',
      source: 'local' as const,
    },
    ...sidebarItems,
  ];

  return (
    <>
      {/* 扩展的横向列表 - 只展示图标的小球样式 */}
      <div
        className={`fixed flex items-center gap-2 z-40 transition-all duration-300 ease-in-out ${
          isExpanded 
            ? 'opacity-100 translate-x-0 pointer-events-auto' 
            : 'opacity-0 translate-x-20 pointer-events-none'
        }`}
        style={{
          bottom: '1.5rem', // bottom-6
          right: 'calc(4rem + 32px)', // 主小球宽度(3.5rem) + 右间距32px
        }}
      >
        {allMenuItems.map((item) => (
          <button
            key={item.id}
            className={`w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 hover:shadow-lg ${
              activeItem === item.id 
                ? 'ring-2 ring-blue-400 ring-offset-1 bg-gradient-to-br from-blue-50 to-indigo-50' 
                : ''
            }`}
            onClick={() => handleItemClick(item.id)}
            title={item.label}
          >
            <span className="text-xl">{item.icon}</span>
          </button>
        ))}
        <button
            className={`w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 hover:shadow-lg `}
            onClick={() => setIsSettingsOpen(true)}
          >
            <span className="text-xl">⚙️</span>
          </button>
      </div>

      {/* 小圆标按钮 - 旋转360度 */}
      <button
        className={`fixed bottom-6 right-6 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center cursor-pointer border-none transition-all duration-500 ease-in-out hover:scale-105 hover:shadow-xl z-50 ${
          isExpanded ? 'rotate-360' : ''
        }`}
        onClick={handleCircleClick}
        aria-label={isExpanded ? "关闭菜单" : "打开菜单"}
      >
        <img 
          className="w-8 h-8" 
          src={iconSrc} 
          alt="菜单" 
        />
      </button>
    </>
  );
};

export default Circle;