// stores/appStore.ts
import { Socket } from 'socket.io-client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ChatMessage {
  username: string;
  message: string;
  timestamp: number;
  type: 'public' | 'private';
  target?: string;
}

interface AppState {
  // 原有属性
  username: string;
  setUsername: (name: string) => void;
  socket: Socket | null;
  setSocket: (socket: Socket | null) => void;
  serverpush: boolean;
  setServerpush: (value: boolean) => void;
  msgTips: boolean;
  setMsgTips: (value: boolean) => void;
  activeItem: string;
  setActiveItem: (item: string) => void;
  settingOpen: boolean;
  setSettingOpen: (value: boolean) => void;

  // 新增消息相关
  publicMessages: ChatMessage[];
  privateMessages: { [target: string]: ChatMessage[] };
  setPublicMessages: (messages: ChatMessage[]) => void;
  addPublicMessage: (msg: ChatMessage) => void;
  setPrivateMessages: (messages: { [target: string]: ChatMessage[] }) => void;
  addPrivateMessage: (msg: ChatMessage) => void;
}

const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      username: 'Youkel',
      setUsername: (name) => set({ username: name }),
      socket: null,
      setSocket: (socket) => set({ socket }),
      serverpush: false,
      setServerpush: (value) => set({ serverpush: value }),
      msgTips: true,
      setMsgTips: (value) => set({ msgTips: value }),
      activeItem: 'start',
      setActiveItem: (item) => set({ activeItem: item }),
      settingOpen: false,
      setSettingOpen: (value) => set({ settingOpen: value }),

      publicMessages: [],
      privateMessages: {},
      setPublicMessages: (messages) => set({ publicMessages: messages }),
      addPublicMessage: (msg) =>
        set((state) => ({ publicMessages: [...state.publicMessages, msg] })),
      setPrivateMessages: (messages) => set({ privateMessages: messages }),
      addPrivateMessage: (msg) =>
        set((state) => {
          // 根据当前用户确定聊天对象 key
          const currentUser = state.username;
          const key = msg.target === currentUser ? msg.username : msg.target!;
          const existing = state.privateMessages[key] || [];
          return {
            privateMessages: {
              ...state.privateMessages,
              [key]: [...existing, msg],
            },
          };
        }),
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
