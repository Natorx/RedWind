// layout/drawer/DrawerPage.tsx
import React, { useState } from 'react';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';
import avatar from '../mock/pics/avatar.jpg';
import { useSettingDrawer } from '../context/drawerSettingContext';

export const DrawerPage: React.FC = () => {
  const { isSettingsOpen, setIsSettingsOpen } = useSettingDrawer();

  // 为每个设置项添加独立的 Modal 状态
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPluginModalOpen, setPluginModalOpen] = useState(false);

  return (
    <>
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
            {/* 个人资料 */}
            <div
              className="setting-item p-3 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
              onClick={() => setIsProfileModalOpen(true)}
            >
              <span className="text-gray-700">个人资料</span>
            </div>

            {/* 扩展配置 */}
            <div
              className="setting-item p-3 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
              onClick={() => setPluginModalOpen(true)}
            >
              <span className="text-gray-700">扩展设置</span>
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

      {/* 个人资料 Modal */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="个人资料"
        animationType="bounce"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              用户名
            </label>
            <input
              type="text"
              defaultValue="Natorx"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              邮箱
            </label>
            <input
              type="email"
              defaultValue="natorx@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              个人简介
            </label>
            <textarea
              rows={3}
              defaultValue="这是一个个人简介..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => {
                alert('个人资料已保存');
                setIsProfileModalOpen(false);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </Modal>

      {/* 扩展设置 Modal */}
      <Modal
        isOpen={isPluginModalOpen}
        onClose={() => setPluginModalOpen(false)}
        title="扩展管理"
      >
        <div className="space-y-4">
          <div>
            1
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setPluginModalOpen(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => {
                alert('密码已更新');
                setPluginModalOpen(false);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              更新密码
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
