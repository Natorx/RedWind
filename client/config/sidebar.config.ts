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
    | 'others';
};

export const startPage_latestFeatures = [
  { id:'agent', label:'Deepseek Agent', icon:'🤖', date:'2025-05-25' },
  { id:'wasm', label:'WASM工具', icon:'⚙️', date:'2025-05-22' },
  { id: 'audio-control', label: '音频控制', icon: '🎵', date: '2025-05-01' },
];

export const sidebarItems: SidebarItem[] = [
  // ========== server (优先级最高) ==========
  { id: 'server-chat', label: '聊天室', icon: '💬', order: 13, source: 'server' },
  { id: 'agent', label: 'Deepseek Agent', icon: '🤖', order: 14, source: 'server' },
  { id: 'community', label: '社区', icon: '🏠', order: 24, source: 'server' },

  // ========== local ==========
  { id: 'dashboard', label: '仪表盘', icon: '📊', order: 1, source: 'local' },
  { id: 'typing-practice', label: '打字练习', icon: '⌨️', order: 2, source: 'local' },
  { id: 'audio-control', label: '音频控制', icon: '🎵', order: 3, source: 'local' },
  { id: 'printer', label: '本地打印', icon: '🖨️', order: 4, source: 'local' },
  { id: 'api-debug', label: 'API调试', icon: '🛠️', order: 7, source: 'local' },
  { id: 'algorithms', label: '算法', icon: '🧮', order: 8, source: 'local' },
  { id: 'file-hander', label: '文件处理', icon: '🔄', order: 9, source: 'local' },
  { id: 'qrcode', label: '二维码生成', icon: '📱', order: 10, source: 'local' },
  { id: 'charts', label: '图表', icon: '📊', order: 11, source: 'local' },
  { id: 'doc-reader', label: '文档阅读器', icon: '📖', order: 23, source: 'local' },
  { id: 'todo', label: '待办事项', icon: '📝', order: 25, source: 'local' },

  // ========== 其他 (external / others / basic) ==========
  { id: 'chatbox', label: 'Deepseek chat', icon: '💬', order: 12, source: 'external' },
  // 如果有 'others' 或 'basic' 的项，按 order 插入此处

  // ========== 未开发 (coming_soon / incomplete) ==========
  // 注意：incomplete 优先级略高于 coming_soon？按 order 混合排序即可
  { id: 'p2p-chat', label: 'P2P聊天', icon: '💬', order: 16, source: 'incomplete' },
  { id: 'drill-ground', label: '演练场', icon: '🏟️', order: 15, source: 'coming_soon' },
  { id: 'file-sharing', label: '文件共享', icon: '📁', order: 17, source: 'coming_soon' },
  { id: 'remote-desktop', label: '远程桌面', icon: '🖥️', order: 18, source: 'coming_soon' },
  { id: 'multi-device-login', label: '多设备登录', icon: '🔐', order: 19, source: 'coming_soon' },
  { id: 'music-player', label: '音乐播放器', icon: '🎧', order: 20, source: 'coming_soon' },
  { id: 'docs', label: '层级文档', icon: '📚', order: 21, source: 'coming_soon' },
  { id: 'plugins', label: '插件扩展', icon: '🔌', order: 22, source: 'coming_soon' },
];


export default sidebarItems;
