// src/store/requestStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 类型（与 RequestTool 保持一致）
interface ParamItem {
  key: string;
  value: string;
  enabled: boolean;
}
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface SavedRequest {
  id: string;
  note: string;
  method: HttpMethod;
  url: string;
  params: ParamItem[];
  headers: ParamItem[];
  body: string;
  timestamp: number;
}

interface RequestStore {
  savedRequests: SavedRequest[];
  addRequest: (req: Omit<SavedRequest, 'id' | 'timestamp'>) => void;
  removeRequest: (id: string) => void;
  updateRequestNote: (id: string, note: string) => void;
}

export const useRequestStore = create<RequestStore>()(
  persist(
    (set) => ({
      savedRequests: [],
      addRequest: (req) =>
        set((state) => ({
          savedRequests: [
            ...state.savedRequests,
            { ...req, id: Date.now().toString(), timestamp: Date.now() },
          ],
        })),
      removeRequest: (id) =>
        set((state) => ({
          savedRequests: state.savedRequests.filter((r) => r.id !== id),
        })),
      updateRequestNote: (id, note) =>
        set((state) => ({
          savedRequests: state.savedRequests.map((r) =>
            r.id === id ? { ...r, note } : r
          ),
        })),
    }),
    {
      name: 'request-storage', // localStorage 的键名
    }
  )
);
