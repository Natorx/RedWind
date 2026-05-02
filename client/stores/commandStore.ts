// src/stores/commandStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedCommand {
  id: string;
  name: string;
  path: string;
  description: string;
  createdAt: string;
}

interface CommandStore {
  savedCommands: SavedCommand[];
  addCommand: (command: SavedCommand) => void;
  removeCommand: (id: string) => void;
  getCommandByName: (name: string) => SavedCommand | undefined;
  clearCommands: () => void;
}

export const useCommandStore = create<CommandStore>()(
  persist(
    (set, get) => ({
      savedCommands: [],

      clearCommands: () => {
        set({ savedCommands: [] });
      },

      addCommand: (command) => {
        const { savedCommands } = get();
        // 检查是否已存在同名命令
        const exists = savedCommands.some((cmd) => cmd.name === command.name);
        if (exists) {
          console.error('命令已存在');
          return;
        }
        set({ savedCommands: [...savedCommands, command] });
      },

      removeCommand: (id) => {
        set({
          savedCommands: get().savedCommands.filter((cmd) => cmd.id !== id),
        });
      },

      getCommandByName: (name) => {
        return get().savedCommands.find((cmd) => cmd.name === name);
      },
    }),
    {
      name: 'command-storage', // localStorage key
    },
  ),
);
