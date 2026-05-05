type SidebarItem = {
  id: string;
  label: string;
  icon: string;
  order: number;
  source:
    | 'server'
    | 'local'
    | 'coming_soon'
    | 'incomplete'
    | 'external'
    | 'basic'
    | 'others'
};

export const sidebarItems: SidebarItem[] = [
  // ========== 常用工具 (local, order: 1-9) ==========
  {
    id: 'dashboard',
    label: '仪表盘',
    icon: '📊',
    order: 1,
    source: 'incomplete',
  },
  {
    id: 'typing-practice',
    label: '英语打字练习',
    icon: '⌨️',
    order: 2,
    source: 'local',
  },
  {
    id: 'audio-control',
    label: '音频控制',
    icon: '🎵',
    order: 3,
    source: 'local',
  },
  {
    id: 'recorder',
    label: '录音机',
    icon: '🎙️',
    order: 4,
    source: 'local',
  },
  {
    id: 'printer',
    label: '本地打印',
    icon: '🖨️',
    order: 5,
    source: 'local',
  },
  {
    id: 'process-manager',
    label: '系统信息',
    icon: '💻',
    order: 6,
    source: 'local',
  },
  {
    id: 'sys-commands',
    label: '系统命令',
    icon: '⚡',
    order: 7,
    source: 'local',
  },
  {
    id: 'api-debug',
    label: 'API接口调试',
    icon: '🛠️',
    order: 8,
    source: 'local',
  },
  {
    id: 'algorithms',
    label: '算法',
    icon: '🧮',
    order: 9,
    source: 'local',
  },
  {
    id: 'conversion',
    label: '文件格式转换',
    icon: '🔄',
    order: 10,
    source: 'local',
  },
  {
    id: 'qrcode',
    label: '二维码生成',
    icon: '📱',
    order: 11,
    source: 'local',
  },
  {
    id: 'charts',
    label: '图表',
    icon: '📊',
    order: 12,
    source: 'local',
  },

  // ========== 外部服务 (external, order: 13) ==========
  {
    id: 'chatbox',
    label: 'Chatbox Mini',
    icon: '💬',
    order: 13,
    source: 'external',
  },

  // ========== 服务器功能 (server, order: 14-16) ==========
  {
    id: 'server-chat',
    label: '服务聊天室',
    icon: '💬',
    order: 14,
    source: 'server',
  },
  {
    id: 'web-scraper',
    label: '网页解构',
    icon: '🕸️',
    order: 15,
    source: 'incomplete',
  },
  {
    id: 'drill-ground',
    label: '演练场',
    icon: '🏟️',
    order: 16,
    source: 'coming_soon',
  },

  // ========== 网络功能 (coming_soon & incomplete, order: 17-22) ==========
  {
    id: 'network-scanner',
    label: '局域网扫描',
    icon: '📡',
    order: 17,
    source: 'coming_soon',
  },
  {
    id: 'p2p-chat',
    label: 'P2P聊天室',
    icon: '💬',
    order: 18,
    source: 'incomplete',
  },
  {
    id: 'file-sharing',
    label: '文件共享',
    icon: '📁',
    order: 19,
    source: 'coming_soon',
  },
  {
    id: 'remote-desktop',
    label: '桌面远程控制',
    icon: '🖥️',
    order: 20,
    source: 'coming_soon',
  },
  {
    id: 'multi-device-login',
    label: '多设备登录',
    icon: '🔐',
    order: 21,
    source: 'coming_soon',
  },

  // ========== 多媒体 (coming_soon, order: 22-24) ==========
  {
    id: 'music-player',
    label: '音乐播放器',
    icon: '🎧',
    order: 22,
    source: 'coming_soon',
  },

  // ========== 文档与扩展 (coming_soon, order: 23-26) ==========
  {
    id: 'docs',
    label: '层级结构文档',
    icon: '📚',
    order: 23,
    source: 'coming_soon',
  },
  {
    id: 'email',
    label: '基础邮件收发',
    icon: '📧',
    order: 24,
    source: 'coming_soon',
  },
  {
    id: 'plugins',
    label: '插件扩展',
    icon: '🧩',
    order: 25,
    source: 'coming_soon',
  },
];

export default sidebarItems;