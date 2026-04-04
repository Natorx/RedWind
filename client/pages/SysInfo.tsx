// src/components/Hardware.tsx
import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface HardwareInfo {
  cpu_name: string;
  cpu_cores: number;
  cpu_usage: number;
  cpu_frequency: number;
  memory_total: number;
  memory_used: number;
  memory_free: number;
}

const SysInfo: React.FC = () => {
  const [info, setInfo] = useState<HardwareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatBytes = (bytes: number): string => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
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
      intervalRef.current = setInterval(loadHardwareInfo, 1000); // 每秒刷新
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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* 控制栏 */}
      <div className="flex justify-end gap-3">
        <button
          onClick={manualRefresh}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          手动刷新
        </button>
        <button
          onClick={toggleAutoRefresh}
          className={`px-4 py-2 rounded-lg transition-colors ${
            isAutoRefresh 
              ? 'bg-green-500 hover:bg-green-600 text-white' 
              : 'bg-gray-500 hover:bg-gray-600 text-white'
          }`}
        >
          {isAutoRefresh ? '自动刷新中 ✓' : '开启自动刷新'}
        </button>
      </div>

      {/* CPU 卡片 */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>🖥️</span> CPU 处理器
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">型号:</span>
            <span className="font-medium text-gray-800">{info.cpu_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">核心数:</span>
            <span className="font-medium text-gray-800">{info.cpu_cores} 核心</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">频率:</span>
            <span className="font-medium text-gray-800">{info.cpu_frequency} MHz</span>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-600">使用率:</span>
              <span className="font-medium text-blue-600 animate-pulse">
                {info.cpu_usage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 rounded-full h-3 transition-all duration-300"
                style={{ width: `${info.cpu_usage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 内存卡片 */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>💾</span> 内存
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">总内存:</span>
            <span className="font-medium text-gray-800">{formatBytes(info.memory_total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">已用内存:</span>
            <span className="font-medium text-gray-800">{formatBytes(info.memory_used)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">可用内存:</span>
            <span className="font-medium text-gray-800">{formatBytes(info.memory_free)}</span>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-600">使用率:</span>
              <span className="font-medium text-green-600 animate-pulse">
                {memoryPercent.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-green-600 rounded-full h-3 transition-all duration-300"
                style={{ width: `${memoryPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 实时时间戳 */}
      <div className="text-center text-sm text-gray-400">
        最后更新: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default SysInfo;