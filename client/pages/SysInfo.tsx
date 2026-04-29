// src/components/Hardware.tsx
import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface DiskInfo {
  name: string;
  mount_point: string;
  total_space: number;
  available_space: number;
  is_removable: boolean;
}

interface NetworkInfo {
  name: string;
  total_received: number;
  total_transmitted: number;
}

interface ComponentInfo {
  label: string;
  temperature: number;
  max_temperature: number | null;
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
  networks: NetworkInfo[];
  components: ComponentInfo[];
}

const Used: React.FC = () => {
  const [info, setInfo] = useState<HardwareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  const formatSmallBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  };

  const loadHardwareInfo = async () => {
    try {
      const data = await invoke<HardwareInfo>('get_hardware_info');
      setInfo(data);
    } catch (error) {
      console.error('Failed to get hardware info:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHardwareInfo();
    
    if (isAutoRefresh) {
      intervalRef.current = setInterval(loadHardwareInfo, 3000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAutoRefresh]);

  const toggleAutoRefresh = () => {
    setIsAutoRefresh(!isAutoRefresh);
  };

  const manualRefresh = () => {
    loadHardwareInfo();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!info) {
    return <div className="text-red-500">无法获取硬件信息</div>;
  }

  const memoryPercent = (info.memory_used / info.memory_total) * 100;
  const swapPercent = info.swap_total > 0 ? (info.swap_used / info.swap_total) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* 控制栏 - 紧凑 */}
      <div className="flex justify-end gap-2 mb-4">
        <button
          onClick={manualRefresh}
          className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          刷新
        </button>
        <button
          onClick={toggleAutoRefresh}
          className={`px-3 py-1.5 text-sm rounded transition-colors ${
            isAutoRefresh 
              ? 'bg-green-500 hover:bg-green-600 text-white' 
              : 'bg-gray-500 hover:bg-gray-600 text-white'
          }`}
        >
          {isAutoRefresh ? '自动' : '手动'}
        </button>
      </div>

      {/* 网格布局 - 紧凑卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* 系统信息 */}
        <div className="bg-white rounded-lg shadow-sm p-14 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1 border-b pb-1">
            <span>💻</span> 系统
          </h3>
          <div className="space-y-1 text-xs">
            {info.system_name && (
              <div className="flex justify-between">
                <span className="text-gray-500">系统:</span>
                <span className="font-mono text-gray-700 truncate ml-2">{info.system_name}</span>
              </div>
            )}
            {info.system_kernel && (
              <div className="flex justify-between">
                <span className="text-gray-500">内核:</span>
                <span className="font-mono text-gray-700 truncate ml-2">{info.system_kernel}</span>
              </div>
            )}
            {info.host_name && (
              <div className="flex justify-between">
                <span className="text-gray-500">主机:</span>
                <span className="font-mono text-gray-700 truncate ml-2">{info.host_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* CPU 信息 */}
        <div className="bg-white rounded-lg shadow-sm p-14 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1 border-b pb-1">
            <span>🖥️</span> CPU
          </h3>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">{info.cpu_name.split('@')[0].trim()}</span>
              <span className="font-mono font-medium">{info.cpu_cores}核</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">频率</span>
              <span className="font-mono">{info.cpu_frequency} MHz</span>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-gray-500">使用率</span>
                <span className="font-mono font-medium text-blue-600">{info.cpu_usage.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-blue-600 rounded-full h-1.5 transition-all"
                  style={{ width: `${info.cpu_usage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 内存信息 */}
        <div className="bg-white rounded-lg shadow-sm p-14 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1 border-b pb-1">
            <span>💾</span> 内存
          </h3>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">总计</span>
              <span className="font-mono">{formatBytes(info.memory_total)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">已用/空闲</span>
              <span className="font-mono">{formatBytes(info.memory_used)} / {formatBytes(info.memory_free)}</span>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-gray-500">使用率</span>
                <span className="font-mono font-medium text-green-600">{memoryPercent.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-green-600 rounded-full h-1.5 transition-all"
                  style={{ width: `${memoryPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Swap 信息 */}
        {info.swap_total > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-14 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1 border-b pb-1">
              <span>🔄</span> Swap
            </h3>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">总计</span>
                <span className="font-mono">{formatBytes(info.swap_total)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">已用</span>
                <span className="font-mono">{formatBytes(info.swap_used)}</span>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-gray-500">使用率</span>
                  <span className="font-mono font-medium text-orange-600">{swapPercent.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-orange-600 rounded-full h-1.5 transition-all"
                    style={{ width: `${swapPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 磁盘信息 - 紧凑显示 */}
        {info.disks.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-14 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1 border-b pb-1">
              <span>💿</span> 磁盘
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {info.disks.slice(0, 4).map((disk, index) => {
                const used = disk.total_space - disk.available_space;
                const usage = (used / disk.total_space) * 100;
                return (
                  <div key={index} className="text-xs">
                    <div className="flex justify-between mb-0.5">
                      <span className="font-mono text-gray-700">
                        {disk.mount_point}
                        {disk.is_removable && <span className="ml-1 text-gray-400">📀</span>}
                      </span>
                      <span className="text-gray-500">{formatSmallBytes(used)}/{formatSmallBytes(disk.total_space)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div 
                        className="bg-purple-600 rounded-full h-1 transition-all"
                        style={{ width: `${usage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {info.disks.length > 4 && (
                <div className="text-center text-gray-400 text-xs">+{info.disks.length - 4} 更多</div>
              )}
            </div>
          </div>
        )}

        {/* 网络信息 - 紧凑显示 */}
        {info.networks.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-14 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1 border-b pb-1">
              <span>🌐</span> 网络
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {info.networks.slice(0, 3).map((network, index) => (
                <div key={index} className="text-xs">
                  <div className="font-mono text-gray-700 truncate">{network.name}</div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-gray-500">↓ {formatSmallBytes(network.total_received)}</span>
                    <span className="text-gray-500">↑ {formatSmallBytes(network.total_transmitted)}</span>
                  </div>
                </div>
              ))}
              {info.networks.length > 3 && (
                <div className="text-center text-gray-400 text-xs">+{info.networks.length - 3} 更多</div>
              )}
            </div>
          </div>
        )}

        {/* 温度信息 - 紧凑显示 */}
        {info.components.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-14 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1 border-b pb-1">
              <span>🌡️</span> 温度
            </h3>
            <div className="space-y-2">
              {info.components.slice(0, 4).map((component, index) => {
                const tempColor = component.temperature > 80 ? 'text-red-600' : 
                                 component.temperature > 60 ? 'text-orange-500' : 'text-green-600';
                return (
                  <div key={index} className="text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-700 truncate">{component.label.split(' ')[0]}</span>
                      <span className={`font-mono font-medium ${tempColor}`}>
                        {component.temperature.toFixed(0)}°C
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-0.5">
                      <div 
                        className={`rounded-full h-1 transition-all ${
                          component.temperature > 80 ? 'bg-red-600' : 
                          component.temperature > 60 ? 'bg-orange-500' : 'bg-green-600'
                        }`}
                        style={{ width: `${(component.temperature / 100) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {info.components.length > 4 && (
                <div className="text-center text-gray-400 text-xs">+{info.components.length - 4} 更多</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 时间戳 - 更紧凑 */}
      <div className="text-center text-xs text-gray-400 mt-4">
        {new Date().toLocaleString()}
      </div>
    </div>
  );
};

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

type SortKey = 'pid' | 'name' | 'cpuUsage' | 'memoryKb' | 'totalWrittenBytes' | 'writtenBytes' | 'totalReadBytes' | 'readBytes';


const Debug: React.FC = () => {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('pid');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(false);
  const [killingPid, setKillingPid] = useState<string | null>(null);

  const fetchProcesses = () => {
    setLoading(true);
    invoke<ProcessInfo[]>('get_process')
      .then((result) => {
        setProcesses(result);
        console.log('进程列表已更新:', new Date().toLocaleTimeString(), result.length);
      })
      .catch((error) => {
        console.error('调用失败:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleKillProcess = (pid: string, name: string) => {
    if (window.confirm(`确定要杀死进程 "${name}" (PID: ${pid}) 吗？\n\n注意：杀死系统进程可能导致系统不稳定！`)) {
      setKillingPid(pid);
      invoke<string>('kill_process', { pid: parseInt(pid) })
        .then((result) => {
          console.log(result);
          alert(`✅ ${result}`);
          fetchProcesses(); // 刷新进程列表
        })
        .catch((error) => {
          console.error('杀死进程失败:', error);
          alert(`❌ 杀死进程失败: ${error}`);
        })
        .finally(() => {
          setKillingPid(null);
        });
    }
  };

  // 页面加载时获取一次
  useEffect(() => {
    fetchProcesses();
  }, []);

  // 每隔3秒自动刷新
  useEffect(() => {
    const interval = setInterval(() => {
      fetchProcesses();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

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
    if (mb < 1024) return `${mb.toFixed(2)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const getSortedProcesses = () => {
    const sorted = [...processes];
    sorted.sort((a, b) => {
      let aVal: any = a[sortKey];
      let bVal: any = b[sortKey];
      
      if (sortKey === 'pid') {
        aVal = parseInt(a.pid);
        bVal = parseInt(b.pid);
      }
      
      if (sortKey === 'name') {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  // 判断是否是系统关键进程（避免误杀）
  const isSystemProcess = (name: string): boolean => {
    const systemProcesses = [
      'System', 'System Idle Process', 'svchost.exe', 'winlogon.exe', 
      'csrss.exe', 'services.exe', 'lsass.exe', 'explorer.exe',
      'dwm.exe', 'taskhostw.exe', 'RuntimeBroker.exe'
    ];
    return systemProcesses.some(sp => name.toLowerCase().includes(sp.toLowerCase()));
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            共 {processes.length} 个进程
          </span>
          {loading && (
            <span className="text-sm text-blue-500">
              刷新中...
            </span>
          )}
        </div>
        <button 
          onClick={fetchProcesses}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
          disabled={loading}
        >
          🔄 手动刷新
        </button>
      </div>
      
      {processes.length > 0 && (
        <div className="overflow-auto max-h-120 mb-4">
          <table className="min-w-full bg-white border border-gray-300 text-sm">
            <thead className="bg-gray-200 sticky top-0">
              <tr>
                <th className="px-2 py-2 border text-center w-24">操作</th>
                <th 
                  className="px-3 py-2 border text-left cursor-pointer hover:bg-gray-300 w-20"
                  onClick={() => handleSort('pid')}
                >
                  PID
                </th>
                <th 
                  className="px-2 py-2 border text-left cursor-pointer hover:bg-gray-300"
                  onClick={() => handleSort('name')}
                >
                  进程名称
                </th>
                <th 
                  className="px-3 py-2 border text-right cursor-pointer hover:bg-gray-300 w-28"
                  onClick={() => handleSort('cpuUsage')}
                >
                  CPU使用率 
                </th>
                <th 
                  className="px-3 py-2 border text-right cursor-pointer hover:bg-gray-300 w-28"
                  onClick={() => handleSort('memoryKb')}
                >
                  内存占用 
                </th>
                <th 
                  className="px-3 py-2 border text-right cursor-pointer hover:bg-gray-300 w-32"
                  onClick={() => handleSort('totalWrittenBytes')}
                >
                  历史写入 
                </th>
                <th 
                  className="px-3 py-2 border text-right cursor-pointer hover:bg-gray-300 w-28"
                  onClick={() => handleSort('writtenBytes')}
                >
                  增量写入 
                </th>
                <th 
                  className="px-3 py-2 border text-right cursor-pointer hover:bg-gray-300 w-32"
                  onClick={() => handleSort('totalReadBytes')}
                >
                  历史读取 
                </th>
                <th 
                  className="px-3 py-2 border text-right cursor-pointer hover:bg-gray-300 w-28"
                  onClick={() => handleSort('readBytes')}
                >
                  增量读取 
                </th>
              </tr>
            </thead>
            <tbody>
              {getSortedProcesses().map((proc, idx) => {
                const isSystem = isSystemProcess(proc.name);
                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-2 py-2 border text-center">
                      <button
                        onClick={() => handleKillProcess(proc.pid, proc.name)}
                        disabled={killingPid === proc.pid || isSystem}
                        className={`
                          w-full px-2 py-1 rounded text-xs font-medium transition-colors
                          ${isSystem 
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'bg-red-500 text-white hover:bg-red-600'
                          }
                          ${killingPid === proc.pid ? 'opacity-50 cursor-wait' : ''}
                        `}
                        title={isSystem ? '系统关键进程，禁止杀死' : '杀死进程'}
                      >
                        {killingPid === proc.pid ? '⏳ 杀死中...' : '关闭'}
                      </button>
                    </td>
                    <td className="px-3 py-2 border font-mono">{proc.pid}</td>
                    <td className="px-2 py-2 border truncate max-w-xs" title={proc.name}>
                      {proc.name}
                      {isSystem && (
                        <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-1 rounded whitespace-nowrap">
                          系统进程
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 border text-right">
                      <span className={proc.cpuUsage > 10 ? 'text-red-600 font-bold' : ''}>
                        {proc.cpuUsage.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-3 py-2 border text-right font-mono">{formatMemory(proc.memoryKb)}</td>
                    <td className="px-3 py-2 border text-right font-mono">{formatBytes(proc.totalWrittenBytes)}</td>
                    <td className="px-3 py-2 border text-right font-mono">{formatBytes(proc.writtenBytes)}</td>
                    <td className="px-3 py-2 border text-right font-mono">{formatBytes(proc.totalReadBytes)}</td>
                    <td className="px-3 py-2 border text-right font-mono">{formatBytes(proc.readBytes)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-gray-50 p-3 rounded text-sm">
        <h3 className="font-bold mb-2">📊 字段说明</h3>
        <ul className="space-y-1">
          <li className="p-1">🔖 <strong>PID</strong>: 操作系统分配给每个进程的唯一标识符</li>
          <li className="p-1">💻 <strong>CPU使用率</strong>: 进程占用的CPU百分比（多核可能超过100%）</li>
          <li className="p-1">🧠 <strong>内存占用</strong>: 进程占用的物理内存大小</li>
          <li className="p-1">💾 <strong>历史写入</strong>: 从进程启动到现在，总共向磁盘写入了多少数据</li>
          <li className="p-1">📈 <strong>增量写入</strong>: 自上次调用以来，新增的写入数据量</li>
          <li className="p-1">📖 <strong>历史读取</strong>: 从进程启动到现在，总共从磁盘读取了多少数据</li>
          <li className="p-1">📊 <strong>增量读取</strong>: 自上次调用以来，新增的读取数据量</li>
          <li className="p-1 text-red-600">⚠️ <strong>杀死进程</strong>: 红色按钮可杀死进程，系统关键进程会被保护禁止杀死</li>
        </ul>
      </div>
    </div>
  );
};

const SysInfo:React.FC = () => {
  return(
    <div>
      <Used/>
      <Debug/>
    </div>
  )
}

export default SysInfo;