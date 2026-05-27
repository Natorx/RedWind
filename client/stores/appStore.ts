/*stores/appStore.ts
@Detail:用户的初始数据，未登录时，需要有一个默认名*/
import { create } from 'zustand';

interface AppState {
  username: string;
  setUsername: (name: string) => void;
}

const useAppStore = create<AppState>((set) => ({
  username: 'Youkel',
  setUsername: (name) => set({ username: name }),
}));

export default useAppStore;
