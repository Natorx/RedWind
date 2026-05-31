/*stores/account.ts
@Detail:用户数据的本地存储，以及调用一些请求的函数*/
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import useAppStore from './app'; // 引入 AppStore
import { accountApi } from '../apis/account';

interface User {
  id: string;
  username: string;
}

interface AccountState {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;

  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User, token: string) => void;
}

const DEFAULT_USERNAME = 'Youkel'; // AppStore 默认值

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoggedIn: false,

      // 登录
      login: async (username: string, password: string) => {
        try {
          const res = await accountApi.login(username, password);
          const { token, user } = res.data;
          set({ user, token, isLoggedIn: true });
          // 同步更新 AppStore 中的用户名
          useAppStore.getState().setUsername(user.username);
          return true;
        } catch (error) {
          console.error('登录失败:', error);
          return false;
        }
      },

      // 退出登录
      logout: () => {
        accountApi.logout().catch(() => {});
        set({ user: null, token: null, isLoggedIn: false });
        // 恢复 AppStore 用户名到默认值
        useAppStore.getState().setUsername(DEFAULT_USERNAME);
      },

      // 直接设置用户（如手动恢复或外部调用）
      setUser: (user: User, token: string) => {
        set({ user, token, isLoggedIn: true });
        useAppStore.getState().setUsername(user.username);
      },
    }),
    {
      name: 'account-storage',
      // 持久化恢复完成后同步 AppStore
      onRehydrateStorage: () => {
        return (state, error) => {
          if (state && !error && state.isLoggedIn && state.user) {
            useAppStore.getState().setUsername(state.user.username);
          } else {
            // 未登录或恢复失败时恢复默认值
            useAppStore.getState().setUsername(DEFAULT_USERNAME);
          }
        };
      },
    }
  )
);
