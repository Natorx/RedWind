// stores/appStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AppState {
  // 原有属性
  username: string;
  setUsername: (name: string) => void;
  serverpush: boolean;
  setServerpush: (value: boolean) => void;
  activeItem: string;
  setActiveItem: (item: string) => void;
  settingOpen: boolean;
  setSettingOpen: (value: boolean) => void;
}

const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      username: 'Youkel',
      setUsername: (name) => set({ username: name }),
      serverpush: false,
      setServerpush: (value) => set({ serverpush: value }),
      activeItem: 'start',
      setActiveItem: (item) => set({ activeItem: item }),
      settingOpen: false,
      setSettingOpen: (value) => set({ settingOpen: value }),
    }),
    {
      name: 'app-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        username: state.username,
        serverpush: state.serverpush,
        activeItem: state.activeItem,
        settingOpen: state.settingOpen,
      }),
    },
  ),
);

export default useAppStore;
