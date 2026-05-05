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
  // ========== incomplete ==========
  {
    id: 'dashboard',
    label: '仪表盘',
    icon: '📈',
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

  // ========== local ==========
  {
    id: 'audio-control',
    label: '音频控制',
    icon: '🎵',
    order: 3,
    source: 'local',
  },
  {
    id: 'api-debug',
    label: 'API接口调试',
    icon: '🛠️',
    order: 4,
    source: 'local',
  },
  {
    id: 'algorithms',
    label: '算法',
    icon: '🧮',
    order: 6,
    source: 'local',
  },
  {
    id: 'process-manager',
    label: '系统信息',
    icon: '💻',
    order: 7,
    source: 'local',
  },
  {
    id: 'conversion',
    label: '文件格式转换',
    icon: '🔄',
    order: 9,
    source: 'local',
  },
  {
    id: 'recorder',
    label: '录音机',
    icon: '🎙️',
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
    icon: '📉',
    order: 12,
    source: 'local',
  },
  {
    id: 'sys-commands',
    label: '系统命令',
    icon: '⚡',
    order: 13,
    source: 'local',
  },
  {
    id: 'network-scanner',
    label: '局域网扫描',
    icon: '📡',
    order: 31,
    source: 'coming_soon',
  },
  {
    id: 'drill-ground',
    label: '演练场',
    icon: '⛳',
    order: 32,
    source: 'coming_soon',
  },
  {
    id: 'p2p-chat',
    label: '聊天室',
    icon: '⛳',
    order: 33,
    source: 'incomplete',
  },
  {
    id: 'server-chat',
    label: '服务聊天室',
    icon: '⛳',
    order: 34,
    source: 'server',
  },

  // ========== server ==========
  {
    id: 'printer',
    label: '本地打印',
    icon: '🖨️',
    order: 5,
    source: 'local',
  },
  {
    id: 'web-scraper',
    label: '网页解构',
    icon: '🕷️',
    order: 14,
    source: 'incomplete',
  },

  // ========== external ==========
  {
    id: 'chatbox',
    label: 'Chatbox Mini',
    icon: '🤖',
    order: 8,
    source: 'external',
  },

  // ========== coming_soon ==========
  {
    id: 'docs',
    label: '层级结构文档',
    icon: '📚',
    order: 18,
    source: 'coming_soon',
  },
  {
    id: 'music-player',
    label: '音乐播放器',
    icon: '🎧',
    order: 21,
    source: 'coming_soon',
  },
  {
    id: 'email',
    label: '基础邮件收发',
    icon: '✉️',
    order: 23,
    source: 'coming_soon',
  },
  {
    id: 'file-sharing',
    label: '文件共享',
    icon: '📎',
    order: 26,
    source: 'coming_soon',
  },
  {
    id: 'multi-device-login',
    label: '多设备登录',
    icon: '🔐',
    order: 27,
    source: 'coming_soon',
  },
  {
    id: 'plugins',
    label: '插件扩展',
    icon: '🧩',
    order: 28,
    source: 'coming_soon',
  },
  {
    id: 'remote-desktop',
    label: '桌面远程控制',
    icon: '🖥️',
    order: 29,
    source: 'coming_soon',
  },
];

export default sidebarItems;