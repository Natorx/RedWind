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
  { id:'dashboard', label:'系统控制', icon:'📊', date:'2025-05-27' },
  { id:'agent', label:'Deepseek Agent', icon:'🤖', date:'2025-05-25' },
];

export const sidebarItems: SidebarItem[] = [
  // ========== server (优先级最高) ==========
  { id:'subscribe', label:'我的订阅', icon:'⚙️',order:11,source:'server'},
  { id: 'agent', label: 'AI智能体', icon: '🤖', order: 14, source: 'server' },

  // ========== local ==========
  { id: 'dashboard', label: '系统控制', icon: '📊', order: 1, source: 'local' },
  { id: 'typing-practice', label: '打字练习', icon: '⌨️', order: 2, source: 'local' },
  { id: 'channel', label: '频道', icon: '📺', order: 3, source: 'local' },
  { id: 'printer', label: '本地打印', icon: '🖨️', order: 4, source: 'local' },
  { id: 'file-hander', label: '文件处理', icon: '🔄', order: 9, source: 'local' },
  { id: 'qrcode', label: '二维码生成', icon: '📱', order: 10, source: 'local' },
  // 如果有 'others' 或 'basic' 的项，按 order 插入此处

];


export default sidebarItems;