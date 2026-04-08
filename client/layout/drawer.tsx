// layout/drawer/DrawerPage.tsx
import React from 'react';
import Drawer from '../components/Drawer';
import avatar from '../mock/pics/avatar.jpg';
import { useSettingDrawer } from '../context/drawerSettingContext';

export const DrawerPage: React.FC = () => {
  const { isSettingsOpen, setIsSettingsOpen } = useSettingDrawer();
  return (
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
              src={avatar}
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
  );
};
