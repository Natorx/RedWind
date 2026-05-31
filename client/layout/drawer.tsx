import React, { useState } from 'react';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';
import { useUiStore } from '../stores/ui';
import { useAccountStore } from '../stores/account'; // 引入账号 store
import avatar from '../assets/avatar.jpg';
import useAppStore from '../stores/appStore';

export const DrawerPage: React.FC = () => {
  const isSettingsOpen = useAppStore((state) => state.settingOpen);
  const setSettingOpen = useAppStore((state) => state.setSettingOpen);

  // 账号状态
  const { user, isLoggedIn, login, logout } = useAccountStore();

  const [isPluginModalOpen, setPluginModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false); // 登录 Modal

  // 登录表单状态
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  // 登录处理
  const handleLogin = async () => {
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError('用户名和密码不能为空');
      return;
    }
    setLoginError('');
    const success = await login(loginUsername, loginPassword);
    if (success) {
      // 登录成功后关闭 Modal，清空表单
      setIsLoginModalOpen(false);
      setLoginUsername('');
      setLoginPassword('');
      setLoginError('');
    } else {
      setLoginError('用户名或密码错误');
    }
  };

  // 退出登录
  const handleLogout = () => {
    logout();
  };

  return (
    <>
      <Drawer
        isOpen={isSettingsOpen}
        onClose={() => setSettingOpen(false)}
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
            <div className="flex-1">
              {/* 用户名：已登录显示 account username，未登录显示“游客” */}
              <h3 className="font-semibold text-white">
                {isLoggedIn ? user?.username : '游客'}
              </h3>
              {/* 在线状态：已登录显示用户ID，未登录显示“游客模式” */}
              <p className="text-10px text-red-400">
                {isLoggedIn ? `${user?.id}` : '游客模式'}
              </p>
            </div>
            {/* 未登录时显示红色小登录按钮 */}
            {!isLoggedIn && (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="w-8 h-8 flex items-center justify-center bg-red-600 hover:bg-red-700 rounded-full transition-all duration-200 shadow-lg shadow-red-500/30"
                title="登录"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* 设置选项 */}
          <div className="space-y-2">

            {/* 刷新应用 */}
            <div
              className="setting-item p-3 hover:bg-red-500/10 rounded-lg cursor-pointer transition-all duration-200 border border-transparent hover:border-red-500/30"
              onClick={() => {
                window.location.reload();
              }}
            >
              <span className="text-neutral-300 hover:text-red-400 transition-colors">
                刷新应用
              </span>
            </div>
            {/* 切换模式 */}
            <div
              className="setting-item p-3 hover:bg-red-500/10 rounded-lg cursor-pointer transition-all duration-200 border border-transparent hover:border-red-500/30"
              onClick={toggleSidebar}
            >
              <span className="text-neutral-300 hover:text-red-400 transition-colors">
                切换模式
              </span>
            </div>

            {/* 操作按钮 */}
            <div className="pt-4 border-t border-red-500/20">
              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="w-full py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-all duration-200 border border-red-500/30 cursor-pointer hover:border-red-500/50"
                >
                  退出登录
                </button>
              ) : (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="w-full py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-all duration-200 border border-red-500/30 cursor-pointer hover:border-red-500/50"
                >
                  登录
                </button>
              )}
            </div>
          </div>
        </div>
      </Drawer>

      {/* 登录 Modal */}
      <Modal
        isOpen={isLoginModalOpen}
        onClose={() => {
          setIsLoginModalOpen(false);
          setLoginError('');
        }}
        title="登录"
        animationType="bounce"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              用户名
            </label>
            <input
              type="text"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              placeholder="请输入用户名"
              maxLength={20}
              className="w-full px-3 py-2 bg-neutral-800 border border-red-500/30 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-white placeholder-neutral-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              密码
            </label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full px-3 py-2 bg-neutral-800 border border-red-500/30 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-white placeholder-neutral-500 transition-all"
            />
          </div>
          {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              onClick={() => {
                setIsLoginModalOpen(false);
                setLoginError('');
              }}
              className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-md hover:bg-neutral-700 transition-all duration-200 border border-neutral-700 hover:border-red-500/30"
            >
              取消
            </button>
            <button
              onClick={handleLogin}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-md hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg shadow-red-500/25 hover:shadow-red-500/40"
            >
              登录
            </button>
          </div>
        </div>
      </Modal>

      {/* 扩展设置 Modal - 不变 */}
      <Modal
        isOpen={isPluginModalOpen}
        onClose={() => setPluginModalOpen(false)}
        title="扩展管理"
      >
        <div className="space-y-4 bg-gradient-to-br from-neutral-900 to-red-950 p-6 rounded-xl">

          <div className="text-neutral-400 p-6 bg-neutral-800/30 rounded-lg border border-red-500/20 text-center">
            <div className="text-4xl mb-3">🔧</div>
            <div className="font-medium">扩展设置内容</div>
            <p className="text-sm text-neutral-500 mt-2">
              更多扩展功能即将上线
            </p>
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
