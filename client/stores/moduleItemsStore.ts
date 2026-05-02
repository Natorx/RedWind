// src/stores/sidebarStore.ts
import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  order: number;
  source: 'server' | 'local' | 'coming_soon' | 'incomplete' | 'external' | 'basic' | 'others';
}

interface SidebarStore {
  sidebarItems: SidebarItem[];
  loading: boolean;
  loadItems: () => Promise<void>;
  addItem: (item: SidebarItem) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  updateOrder: (items: [string, number][]) => Promise<void>;
  updateItem: (id: string, field: keyof SidebarItem, value: string) => Promise<void>;
}

export const useModuleStore = create<SidebarStore>((set, get) => ({
  sidebarItems: [],
  loading: false,

  loadItems: async () => {
    set({ loading: true });
    try {
      const items = await invoke<SidebarItem[]>('get_sidebar_items');
      set({ sidebarItems: items });
    } catch (error) {
      console.error('加载模块失败:', error);
    } finally {
      set({ loading: false });
    }
  },

  addItem: async (item: SidebarItem) => {
    try {
      const { sidebarItems } = get();
      const maxOrder = Math.max(...sidebarItems.map(i => i.order), -1);
      await invoke('add_sidebar_item', {
        id: item.id,
        label: item.label,
        icon: item.icon,
        order: maxOrder + 1,
        source: item.source,
      });
      await get().loadItems(); // 重新加载
    } catch (error) {
      console.error('导入模块失败:', error);
    }
  },

  deleteItem: async (id: string) => {
    try {
      await invoke('delete_sidebar_item', { id });
      await get().loadItems(); // 重新加载
    } catch (error) {
      console.error('删除模块失败:', error);
    }
  },

  updateOrder: async (items: [string, number][]) => {
    try {
      await invoke('update_sidebar_items_order', { items });
      await get().loadItems(); // 重新加载
    } catch (error) {
      console.error('更新顺序失败:', error);
    }
  },

  updateItem: async (id: string, field: keyof SidebarItem, value: string) => {
    try {
      await invoke('update_sidebar_item', { id, [field]: value });
      await get().loadItems(); // 重新加载
    } catch (error) {
      console.error('更新模块失败:', error);
    }
  },
}));