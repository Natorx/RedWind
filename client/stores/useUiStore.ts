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
      // 可选：只持久化部分字段（如果需要）
      // partialize: (state) => ({ activeUi: state.activeUi }),
    }
  )
);

// 也可同时导出一个非 React 的原始 store 对象（如果需要订阅）
// 但 React 组件中直接使用 useUiStore hook 即可。
