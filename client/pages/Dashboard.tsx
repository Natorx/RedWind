/** Dashboard.tsx
 * @Author: Fofow
 * @Date: 2026/4/1
 * @Description: 集成真实系统硬件信息的业务仪表盘（已按需求改造）
 */
import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Users,
  ShoppingCart,
  DollarSign,
  Activity,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  HardDrive,
  Cpu,
} from 'lucide-react';
import { getModuleNum } from '../utils/project';

// ---------- 工具函数 ----------
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatMemory = (kb: number): string => {
  if (kb < 1024) return `${kb} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
};

// ---------- 类型定义 ----------
interface DiskInfo {
  name: string;
  mount_point: string;
  total_space: number;
  available_space: number;
  is_removable: boolean;
}

interface HardwareInfo {
  cpu_name: string;
  cpu_cores: number;
  cpu_usage: number;
  cpu_frequency: number;
  memory_total: number;
  memory_used: number;
  memory_free: number;
  system_name: string | null;
  system_kernel: string | null;
  system_os_version: string | null;
  host_name: string | null;
  swap_total: number;
  swap_used: number;
  disks: DiskInfo[];
  networks: any[];
  components: any[];
}

interface ProcessInfo {
  pid: string;
  name: string;
  cpuUsage: number;
  memoryKb: number;
  totalWrittenBytes: number;
  writtenBytes: number;
  totalReadBytes: number;
  readBytes: number;
}

type SortKey = 'pid' | 'name' | 'memoryKb' | 'totalWrittenBytes' | 'totalReadBytes';

// ==========================================
//           统计卡片组件（未修改）
// ==========================================
const StatCard = ({ title, value, icon: Icon, trend, trendValue, color }: any) => {
  const isPositive = trend === 'up';
  return (
    <div className="bg-neutral-900/80 rounded-xl shadow-lg p-6 border border-red-500/20 backdrop-blur-sm transition-all hover:shadow-xl hover:border-red-500/40">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-neutral-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-neutral-100">{value}</p>
          {trend && (
            <div className="flex items-center mt-2">
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span className={`text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {trendValue}
              </span>
              <span className="text-xs text-neutral-500 ml-1">vs last month</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
};

// ==========================================
//       系统资源卡片（CPU / 内存 / 硬盘 / 网络）
// ==========================================
const SystemResourcesCard = ({ hardware }: { hardware: HardwareInfo | null }) => {
  // 生成所有资源条目
  const resources = [];

  // 1. CPU
  if (hardware) {
    resources.push({
      label: 'CPU',
      icon: Cpu,
      used: `${hardware.cpu_usage.toFixed(0)}%`,
      total: '',
      percent: hardware.cpu_usage,
      color: hardware.cpu_usage > 80 ? 'text-red-400' : hardware.cpu_usage > 60 ? 'text-orange-400' : 'text-green-400',
      barColor: hardware.cpu_usage > 80 ? 'bg-red-500' : hardware.cpu_usage > 60 ? 'bg-orange-500' : 'bg-green-500',
      iconColor: 'bg-blue-500/20 text-blue-400',
    });
  }

  // 2. Memory
  if (hardware) {
    const memPercent = (hardware.memory_used / hardware.memory_total) * 100;
    resources.push({
      label: 'Memory',
      icon: HardDrive,
      used: formatBytes(hardware.memory_used),
      total: formatBytes(hardware.memory_total),
      percent: memPercent,
      color: 'text-green-400',
      barColor: 'bg-green-500',
      iconColor: 'bg-green-500/20 text-green-400',
    });
  }

  // 3. 所有磁盘（每个挂载点单独一行）
  const diskColors = ['text-purple-400', 'text-blue-400', 'text-orange-400', 'text-red-400', 'text-teal-400'];
  const diskBarColors = ['bg-purple-500', 'bg-blue-500', 'bg-orange-500', 'bg-red-500', 'bg-teal-500'];
  const diskIconColors = ['bg-purple-500/20 text-purple-400', 'bg-blue-500/20 text-blue-400', 'bg-orange-500/20 text-orange-400', 'bg-red-500/20 text-red-400', 'bg-teal-500/20 text-teal-400'];
  if (hardware?.disks) {
    hardware.disks.forEach((disk, idx) => {
      const used = disk.total_space - disk.available_space;
      const percent = (used / disk.total_space) * 100;
      const colorIdx = idx % diskColors.length;
      resources.push({
        label: disk.mount_point + (disk.is_removable ? ' 📀' : ''),
        icon: HardDrive,
        used: formatBytes(used),
        total: formatBytes(disk.total_space),
        percent,
        color: diskColors[colorIdx],
        barColor: diskBarColors[colorIdx],
        iconColor: diskIconColors[colorIdx],
      });
    });
  }

  // 4. 所有网络（显示总接收 / 总发送）
  if (hardware?.networks) {
    hardware.networks.forEach((net, idx) => {
      resources.push({
        label: net.name,
        icon: Activity,
        used: `↓ ${formatBytes(net.total_received)}  ↑ ${formatBytes(net.total_transmitted)}`,
        total: '',                 // 网络不显示总量
        percent: null,             // 无进度条
        color: 'text-blue-400',
        barColor: '',
        iconColor: 'bg-blue-500/20 text-blue-400',
      });
    });
  }

  return (
    <div className="bg-neutral-900/80 rounded-xl shadow-lg border border-red-500/20 backdrop-blur-sm">
      <div className="p-4 border-b border-red-500/20">
        <h3 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-red-400" />
          资源占用
        </h3>
      </div>
      <div className="divide-y divide-red-500/10 max-h-117 overflow-y-auto custom-scrollbar scroll-none">
        {resources.map((res, idx) => {
          const IconComponent = res.icon;
          return (
            <div key={idx} className="p-4 hover:bg-red-500/5 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className={`p-2 rounded-lg ${res.iconColor}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-200 truncate">{res.label}</p>
                    {/* 仅当有 percent 时显示进度条 */}
                    {res.percent !== null && (
                      <div className="w-full bg-neutral-700 rounded-full h-1.5 mt-1">
                        <div
                          className={`${res.barColor} rounded-full h-1.5 transition-all`}
                          style={{ width: `${res.percent}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <span className={`text-sm font-semibold ${res.color}`}>{res.used}</span>
                  {res.total && (
                    <span className="text-xs text-neutral-500 ml-1">/ {res.total}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


// ==========================================
//          进程列表表格（替换原图表）
// ==========================================
const ProcessTable = () => {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('pid');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(false);
  const [killingPid, setKillingPid] = useState<string | null>(null);
  const maxMemoryKb = useRef<number>(1024 * 1024);

  const fetchProcesses = () => {
    setLoading(true);
    invoke<ProcessInfo[]>('get_process')
      .then((result) => {
        setProcesses(result);
        if (result.length > 0) {
          maxMemoryKb.current = Math.max(...result.map(p => p.memoryKb), 1024 * 1024);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleKillProcess = (pid: string, name: string) => {
    if (window.confirm(`确定杀死进程 "${name}" (PID: ${pid}) 吗？`)) {
      setKillingPid(pid);
      invoke<string>('kill_process', { pid: parseInt(pid) })
        .then((result) => {
          alert(`✅ ${result}`);
          fetchProcesses();
        })
        .catch((error) => alert(`❌ 失败: ${error}`))
        .finally(() => setKillingPid(null));
    }
  };

  useEffect(() => {
    fetchProcesses();
    const interval = setInterval(fetchProcesses, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSort = (key: SortKey) => {
    setSortKey(key);
    setSortOrder(prev => (sortKey === key && prev === 'asc' ? 'desc' : 'asc'));
  };

  const getSorted = () => {
    const sorted = [...processes];
    sorted.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortKey) {
        case 'pid': aVal = parseInt(a.pid); bVal = parseInt(b.pid); break;
        case 'name': aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); break;
        default: aVal = a[sortKey]; bVal = b[sortKey];
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  const isSystem = (name: string) =>
    ['System', 'svchost.exe', 'services.exe', 'lsass.exe', 'explorer.exe', 'winlogon.exe'].some(
      s => name.toLowerCase().includes(s.toLowerCase())
    );

  return (
    <div className="bg-neutral-900/80 rounded-xl shadow-lg p-6 border border-red-500/20 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-neutral-100">系统进程</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-400">共 {processes.length} 个进程</span>
        </div>
      </div>
      <div className="overflow-auto max-h-96 custom-scrollbar scroll-none">
        <table className="min-w-full bg-neutral-900/80 border border-red-500/20 text-xs rounded-lg">
          <thead className="bg-red-500/10 sticky top-0">
            <tr>
              {/* 操作列：加宽到 w-24 */}
              <th className="px-2 py-1.5 border border-red-500/20 text-center w-24 text-neutral-200">操作</th>
              {/* PID 列：加宽到 w-20 */}
              <th
                className="px-2 py-1.5 border border-red-500/20 text-left cursor-pointer hover:bg-red-500/20 w-20 text-neutral-200"
                onClick={() => handleSort('pid')}
              >
                PID {sortKey === 'pid' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              {/* 名称列：固定宽度 w-48，最大 180px，超出省略 */}
              <th
                className="px-2 py-1.5 border border-red-500/20 text-left cursor-pointer hover:bg-red-500/20 w-48 text-neutral-200"
                onClick={() => handleSort('name')}
              >
                名称 {sortKey === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              {/* 内存列：略微缩小到 w-36 */}
              <th
                className="px-2 py-1.5 border border-red-500/20 text-left cursor-pointer hover:bg-red-500/20 w-36 text-neutral-200"
                onClick={() => handleSort('memoryKb')}
              >
                内存 {sortKey === 'memoryKb' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              {/* 总写入、总读取保持 w-24 */}
              <th
                className="px-2 py-1.5 border border-red-500/20 text-right cursor-pointer hover:bg-red-500/20 w-24 text-neutral-200"
                onClick={() => handleSort('totalWrittenBytes')}
              >
                总写入 {sortKey === 'totalWrittenBytes' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th
                className="px-2 py-1.5 border border-red-500/20 text-right cursor-pointer hover:bg-red-500/20 w-24 text-neutral-200"
                onClick={() => handleSort('totalReadBytes')}
              >
                总读取 {sortKey === 'totalReadBytes' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
            </tr>
          </thead>
          <tbody>
            {getSorted().map((proc, idx) => {
              const memPercent = Math.min((proc.memoryKb / maxMemoryKb.current) * 100, 100);
              return (
                <tr key={idx} className="hover:bg-red-500/5 border-b border-red-500/10">
                  <td className="px-2 py-1 border border-red-500/20 text-center">
                    <button
                      onClick={() => handleKillProcess(proc.pid, proc.name)}
                      disabled={killingPid === proc.pid || isSystem(proc.name)}
                      className={`
                        px-1.5 py-0.5 rounded text-xs font-medium transition-colors w-full
                        ${isSystem(proc.name)
                          ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800'}
                        ${killingPid === proc.pid ? 'opacity-50 cursor-wait' : ''}
                      `}
                    >
                      {killingPid === proc.pid ? '⏳' : '关闭'}
                    </button>
                  </td>
                  <td className="px-2 py-1 border border-red-500/20 font-mono text-neutral-300">{proc.pid}</td>
                  {/* 名称单元格：固定宽度截断，超出省略 */}
                  <td
                    className="px-2 py-1 border border-red-500/20 truncate max-w-[180px] text-neutral-300"
                    title={proc.name}
                  >
                    {proc.name}
                    {isSystem(proc.name) && (
                      <span className="ml-1 text-xs bg-yellow-500/20 text-yellow-400 px-1 rounded">系统</span>
                    )}
                  </td>
                  <td className="px-2 py-1 border border-red-500/20">
                    <div className="flex items-center gap-1">
                      <span className="font-mono w-16 text-right text-xs text-neutral-300">{formatMemory(proc.memoryKb)}</span>
                      <div className="flex-1 bg-neutral-700 rounded-full h-1.5">
                        <div
                          className="bg-green-500 rounded-full h-1.5 transition-all"
                          style={{ width: `${memPercent}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-1 border border-red-500/20 text-right font-mono text-xs text-neutral-300">{formatBytes(proc.totalWrittenBytes)}</td>
                  <td className="px-2 py-1 border border-red-500/20 text-right font-mono text-xs text-neutral-300">{formatBytes(proc.totalReadBytes)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 bg-neutral-900/60 p-3 rounded-lg border border-red-500/20 text-xs text-neutral-400">
        <p>⚠️ 红色按钮可杀死进程，系统进程已保护</p>
      </div>
    </div>
  );
};


// ==========================================
//             主仪表盘组件
// ==========================================
const Dashboard = () => {
  // 硬件信息
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [loadingHw, setLoadingHw] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadHardware = async () => {
    try {
      const data = await invoke<HardwareInfo>('get_hardware_info');
      setHardware(data);
    } catch (error) {
      console.error('获取硬件信息失败:', error);
    } finally {
      setLoadingHw(false);
    }
  };

  useEffect(() => {
    loadHardware();
    intervalRef.current = setInterval(loadHardware, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // 统计卡片数据（第一个改为网络模块）
  const stats = [
    {
      title: '已开发模块',
      value: `${getModuleNum()}`,
      icon: Activity,
      trend: 'up',
      trendValue: '+2 个',
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
    },
    { title: 'Total Users', value: '2,543', icon: Users, trend: 'up', trendValue: '+8.2%', color: 'bg-gradient-to-br from-green-500 to-green-600' },
    { title: 'Total Orders', value: '1,289', icon: ShoppingCart, trend: 'down', trendValue: '-3.1%', color: 'bg-gradient-to-br from-purple-500 to-purple-600' },
    { title: 'Active Sessions', value: '347', icon: Activity, trend: 'up', trendValue: '+5.4%', color: 'bg-gradient-to-br from-orange-500 to-orange-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 to-neutral-900 pt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 统计卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-8">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* 进程列表 + 最近活动 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
          <div className="lg:col-span-2">
            <ProcessTable />
          </div>
          <div className="lg:col-span-1">
            {/* 系统资源卡片（CPU / 内存 / 硬盘）替代原 System Status */}
          <SystemResourcesCard hardware={hardware} />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
