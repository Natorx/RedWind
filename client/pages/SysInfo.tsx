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

const SysInfo: React.FC = () => {
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

export default SysInfo;