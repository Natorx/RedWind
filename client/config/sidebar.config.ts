type SidebarItem = {
  id: string;
  label: string;
  icon: string;
  order: number;
  source:
    | 'server'
    | 'local'
    | 'coming'
    | 'incomplete'
    | 'external'
    | 'basic'
    | 'others';
};

// 首页“最新功能”入口（固定项，不再依赖模块仓库）
export const startPage_latestFeatures = [
  { id: 'dashboard', label: '系统控制', icon: '📊', date: '2025-05-27' },
  { id: 'typing-practice', label: '打字练习', icon: '⌨️', date: '2025-05-25' },
];

// 固定侧栏（不再从数据库动态加载）
export const sidebarItems: SidebarItem[] = [
  { id: 'dashboard', label: '系统控制', icon: '📊', order: 1, source: 'local' },
  { id: 'channel', label: '频道', icon: '📺', order: 2, source: 'local' },
  {
    id: 'typing-practice',
    label: '打字练习',
    icon: '⌨️',
    order: 3,
    source: 'local',
  },
  { id: 'printer', label: '本地打印', icon: '🖨️', order: 4, source: 'local' },
];

/** 已下线模块的 id，启动时用于清理历史数据库残留记录 */
export const REMOVED_MODULE_IDS = [
  'subscribe',
  'agent',
  'file-hander',
  'qrcode',
];

export default sidebarItems;
