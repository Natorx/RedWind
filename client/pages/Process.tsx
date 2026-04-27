import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect } from 'react';

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

export default Debug;