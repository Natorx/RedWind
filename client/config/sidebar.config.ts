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

export const startPage_latestFeatures = [
  { id:'dashboard', label:'仪表盘', icon:'📊', date:'2025-05-27' },
  { id:'agent', label:'Deepseek Agent', icon:'🤖', date:'2025-05-25' },
  { id: 'audio-control', label: '音频控制', icon: '🎵', date: '2025-05-01' },
];

export const sidebarItems: SidebarItem[] = [
  // ========== server (优先级最高) ==========
  { id:'subscribe', label:'我的订阅', icon:'⚙️',order:11,source:'server'},
  { id: 'server-chat', label: '聊天室', icon: '💬', order: 13, source: 'server' },
  { id: 'agent', label: 'AI智能体', icon: '🤖', order: 14, source: 'server' },
  { id: 'community', label: '社区', icon: '🏠', order: 24, source: 'server' },

  // ========== local ==========
  { id: 'dashboard', label: '仪表盘', icon: '📊', order: 1, source: 'local' },
  { id: 'typing-practice', label: '打字练习', icon: '⌨️', order: 2, source: 'local' },
  { id: 'audio-control', label: '音频控制', icon: '🎵', order: 3, source: 'local' },
  { id: 'printer', label: '本地打印', icon: '🖨️', order: 4, source: 'local' },
  { id: 'api-debug', label: 'API调试', icon: '🛠️', order: 7, source: 'local' },
  { id: 'file-hander', label: '文件处理', icon: '🔄', order: 9, source: 'local' },
  { id: 'qrcode', label: '二维码生成', icon: '📱', order: 10, source: 'local' },
  { id: 'doc-reader', label: '文档阅读器', icon: '📖', order: 23, source: 'local' },
  { id: 'todo', label: '待办事项', icon: '📝', order: 25, source: 'local' },
  // 如果有 'others' 或 'basic' 的项，按 order 插入此处

  // ========== 未开发 (coming / incomplete) ==========
  // 注意：incomplete 优先级略高于 coming？按 order 混合排序即可
  { id: 'drill-ground', label: '演练场', icon: '🏟️', order: 15, source: 'coming' },
  { id: 'music-player', label: '音乐播放器', icon: '🎧', order: 20, source: 'coming' },
  { id: 'plugins', label: '插件扩展', icon: '🔌', order: 22, source: 'coming' },
];


export default sidebarItems;