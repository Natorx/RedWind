/*stores/dashboard.ts
@Detail:仪表盘四个卡片的数据配置（未来可能会添加更多配置内容）*/
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getModuleNum } from '../utils/project';

export interface StatItem {
  title: string;
  value: string | number;
  icon: string; // 存储图标名称
  trend: 'up' | 'down';
  trendValue: string;
  color: string;
}

interface StatsState {
  stats: StatItem[];
  updateStats: (newStats: StatItem[]) => void;
  updateModuleCount: () => void;
  refreshStats: () => void;
}

// 初始统计数据模板
const getInitialStats = (): StatItem[] => [
  {
    title: '已开发模块',
    value: `${getModuleNum()}`,
    icon: 'Activity',
    trend: 'up',
    trendValue: '+2 个',
    color: 'bg-gradient-to-br from-blue-500 to-blue-600',
  },
  {
    title: 'Total Users',
    value: '2,543',
    icon: 'Users',
    trend: 'up',
    trendValue: '+8.2%',
    color: 'bg-gradient-to-br from-green-500 to-green-600',
  },
  {
    title: 'Total Orders',
    value: '1,289',
    icon: 'ShoppingCart',
    trend: 'down',
    trendValue: '-3.1%',
    color: 'bg-gradient-to-br from-purple-500 to-purple-600',
  },
  {
    title: 'Active Sessions',
    value: '347',
    icon: 'Activity',
    trend: 'up',
    trendValue: '+5.4%',
    color: 'bg-gradient-to-br from-orange-500 to-orange-600',
  },
];

export const useStatsStore = create<StatsState>()(
  persist(
    (set, get) => ({
      stats: getInitialStats(),
      
      updateStats: (newStats) => set({ stats: newStats }),
      
      updateModuleCount: () => {
        const currentStats = get().stats;
        const updatedStats = currentStats.map(stat => 
          stat.title === '已开发模块' 
            ? { ...stat, value: `${getModuleNum()}` }
            : stat
        );
        set({ stats: updatedStats });
      },
      
      refreshStats: () => {
        set({ stats: getInitialStats() });
      },
    }),
    {
      name: 'stats-storage', // localStorage 的 key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ stats: state.stats }), // 只持久化 stats 字段
    }
  )
);