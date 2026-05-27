/*stores/ui.ts
@Detail:侧栏展示方式的存储管理*/
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UiType = 'circle' | 'sidebar';

interface UiState {
  activeUi: UiType;
  setActiveUi: (ui: UiType) => void;
  toggleSidebar: () => void;
}

// 使用 persist 中间件持久化到 localStorage
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      activeUi: 'sidebar', // 默认值

      setActiveUi: (ui) => set({ activeUi: ui }),

      toggleSidebar: () =>
        set((state) => ({
          activeUi: state.activeUi === 'circle' ? 'sidebar' : 'circle',
        })),
    }),
    {
      name: 'ui-state', // localStorage 中的 key
    }
  )
);

