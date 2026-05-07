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
