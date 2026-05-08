// stores/doc.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DocState {
  path: string | null;
  history: string[];         // 最近打开的文件路径列表（最新在前）
  setPath: (path: string) => void;
  clearPath: () => void;
  clearHistory: () => void;
}

export const useDocStore = create<DocState>()(
  persist(
    (set, get) => ({
      path: null,
      history: [],

      setPath: (path: string) => {
        // 更新当前路径
        set({ path });

        // 将路径添加到历史记录（去重，保持最新在前）
        const history = get().history.filter(p => p !== path);
        history.unshift(path);

        // 限制历史数量（可选，比如20条）
        const MAX_HISTORY = 20;
        if (history.length > MAX_HISTORY) {
          history.pop();
        }

        set({ history });
      },

      clearPath: () => {
        set({ path: null });
      },

      clearHistory: () => {
        set({ history: [] });
      },
    }),
    {
      name: 'doc-reader-storage', // localStorage 中的 key
    }
  )
);
