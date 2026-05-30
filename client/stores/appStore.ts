/* stores/appStore.ts
@Detail:用户的初始数据，已登录时持久化存储 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AppState {
  username: string;
  setUsername: (name: string) => void;
  serverpush: boolean;
  setServerpush: (value: boolean) => void;
}

const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      username: 'Youkel',
      setUsername: (name) => set({ username: name }),
      serverpush: false,
      setServerpush: (value) => set({ serverpush: value }),
    }),
    {
      name: 'app-settings',                // localStorage 中的 key 名称
      storage: createJSONStorage(() => localStorage), // 使用 localStorage（也可改为 sessionStorage）
      // partialize: (state) => ({ username: state.username }), // 可选：只持久化部分字段
    }
  )
);

export default useAppStore;
