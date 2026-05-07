// layout/drawer/DrawerPage.tsx
import React, { useState } from 'react';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';
import avatar from '../mock/pics/avatar.jpg';
import { useSettingDrawer } from '../context/drawerSettingContext';
import { uiState } from '../utils/uiState';
import useAppStore from '../stores/appStore';

export const DrawerPage: React.FC = () => {
  const { isSettingsOpen, setIsSettingsOpen } = useSettingDrawer();
  const { username, setUsername } = useAppStore();

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPluginModalOpen, setPluginModalOpen] = useState(false);

  // 个人资料 Modal 的本地状态
  const [localName, setLocalName] = useState(username);

  const handleSaveProfile = () => {
    if (localName.trim()) {
      setUsername(localName.trim());
      setIsProfileModalOpen(false);
    }
  };

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
          {/* 用户信息部分 - 暗黑风格 */}
          <div className="flex items-center space-x-3 p-3 bg-neutral-800/50 rounded-lg border border-red-500/20">
            <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-red-500/50">
              <img
                src={avatar}
                alt="用户头像"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="font-semibold text-white">{username}</h3>
              <p className="text-sm text-red-400">在线状态</p>
            </div>
          </div>

          {/* 设置选项 */}
          <div className="space-y-2">
            {/* 个人资料 */}
            <div
              className="setting-item p-3 hover:bg-red-500/10 rounded-lg cursor-pointer transition-all duration-200 border border-transparent hover:border-red-500/30"
              onClick={() => {
                setLocalName(username); // 打开时同步当前用户名
                setIsProfileModalOpen(true);
              }}
            >
              <span className="text-neutral-300 hover:text-red-400 transition-colors">个人资料</span>
            </div>

            {/* 扩展配置 */}
            <div
              className="setting-item p-3 hover:bg-red-500/10 rounded-lg cursor-pointer transition-all duration-200 border border-transparent hover:border-red-500/30"
              onClick={() => setPluginModalOpen(true)}
            >
              <span className="text-neutral-300 hover:text-red-400 transition-colors">扩展设置</span>
            </div>

            {/* 刷新应用 */}
            <div
              className="setting-item p-3 hover:bg-red-500/10 rounded-lg cursor-pointer transition-all duration-200 border border-transparent hover:border-red-500/30"
              onClick={() => {
                window.location.reload();
              }}
            >
              <span className="text-neutral-300 hover:text-red-400 transition-colors">刷新应用</span>
            </div>
            {/* 切换模式 */}
            <div
              className="setting-item p-3 hover:bg-red-500/10 rounded-lg cursor-pointer transition-all duration-200 border border-transparent hover:border-red-500/30"
              onClick={() => uiState.toggleSidebar()}
            >
              <span className="text-neutral-300 hover:text-red-400 transition-colors">切换模式</span>
            </div>

            {/* 操作按钮 */}
            <div className="pt-4 border-t border-red-500/20">
              <button className="w-full py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-all duration-200 border border-red-500/30 cursor-pointer hover:border-red-500/50">
                退出登录
              </button>
            </div>
          </div>
        </div>
      </Drawer>

      {/* 个人资料 Modal - 只保留用户名字段 */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="个人资料"
        animationType="bounce"
      >
                  <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              用户名
            </label>
            <input
              type="text"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder="请输入用户名"
              maxLength={20}
              className="w-full px-3 py-2 bg-neutral-800 border border-red-500/30 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-white placeholder-neutral-500 transition-all"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-md hover:bg-neutral-700 transition-all duration-200 border border-neutral-700 hover:border-red-500/30"
            >
              取消
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={!localName.trim()}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-md hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              保存更改
            </button>
          </div>
      </Modal>

      {/* 扩展设置 Modal - 不变 */}
      <Modal
        isOpen={isPluginModalOpen}
        onClose={() => setPluginModalOpen(false)}
        title="扩展管理"
      >
        <div className="space-y-4 bg-gradient-to-br from-neutral-900 to-red-950 p-6 rounded-xl">
          <div className="border-b border-red-500/30 pb-3 mb-4 -mt-2">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-red-500">🔌</span>
              扩展管理
            </h3>
          </div>

          <div className="text-neutral-400 p-6 bg-neutral-800/30 rounded-lg border border-red-500/20 text-center">
            <div className="text-4xl mb-3">🔧</div>
            <div className="font-medium">扩展设置内容</div>
            <p className="text-sm text-neutral-500 mt-2">更多扩展功能即将上线</p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setPluginModalOpen(false)}
              className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-md hover:bg-neutral-700 transition-all duration-200 border border-neutral-700 hover:border-red-500/30"
            >
              取消
            </button>
            <button
              onClick={() => {
                alert('设置已保存');
                setPluginModalOpen(false);
              }}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-md hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg shadow-red-500/25 hover:shadow-red-500/40"
            >
              保存设置
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
