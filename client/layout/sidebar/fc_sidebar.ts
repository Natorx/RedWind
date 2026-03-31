// 侧边栏项目类型
interface SidebarItem {
  id: string;
  label: string;
  icon?: string;
}

export const sidebarItems: SidebarItem[] = [
  { id: 'dashboard', label: '仪表盘', icon: '📊', order: 1 },
  { id: 'api-debug', label: 'API接口调试', icon: '🔍', order: 2 },
  { id: 'analytics', label: '分析', icon: '📈', order: 3 },
  { id: 'api-test', label: 'Rust测试', icon: '🔧', order: 4 },
  { id: 'conversion', label: '文件格式转换', icon: '🔄', order: 8 },
  { id: 'chatbox', label: 'Chatbox Mini', icon: '💬', order: 9 },
  { id: 'web-scraper', label: '网页解构', icon: '🕸️', order: 10 },
  { id: 'encryption', label: '加密算法', icon: '🔐', order: 11 },
  { id: 'cli', label: '命令行调用', icon: '⌨️', order: 12 },
  { id: 'debug', label: '调试环境配置', icon: '🐛', order: 13 },
  { id: 'docs', label: '层级结构文档', icon: '📄', order: 14 },
  { id: 'editor', label: 'Mini代码编辑器', icon: '📝', order: 15 },
  { id: 'hardware', label: '硬件配置读取', icon: '💻', order: 16 },
  { id: 'file-explorer', label: '路径镜像', icon: '📂', order: 17 },
  { id: 'network-devices', label: '网络设备调用', icon: '🌐', order: 18 },
  { id: 'process-manager', label: '进程调度查看', icon: '📊', order: 19 },
  { id: 'music-player', label: '音乐播放器', icon: '🎵', order: 20 },
  { id: 'remote-desktop', label: '桌面远程控制', icon: '🖥️', order: 21 },
  { id: 'app-launcher', label: '应用管理启动', icon: '🚀', order: 22 },
  { id: 'email', label: '基础邮件收发', icon: '📧', order: 23 },
  { id: 'qr-code', label: '二维码生成调用', icon: '📱', order: 24 },
  { id: 'typing-practice', label: '英语打字练习', icon: '⌨️', order: 25 },
  { id: 'file-sharing', label: '文件共享', icon: '📤', order: 26 },
  { id: 'multi-device-login', label: '多设备登录', icon: '🔑', order: 27 },
  { id: 'plugins', label: '插件扩展', icon: '🧩', order: 28 },
].sort((a, b) => a.order - b.order);
