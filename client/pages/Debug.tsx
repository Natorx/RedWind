import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';

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

  const handleGetProcesses = () => {
    invoke<ProcessInfo[]>('get_process')
      .then((result) => {
        setProcesses(result);
        console.log('进程列表:', result);
      })
      .catch((error) => {
        console.error('调用失败:', error);
      });
  };

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

  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="p-4">
      <button 
        onClick={handleGetProcesses}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4"
      >
        获取进程列表
      </button>
      
      {processes.length > 0 && (
        <div className="overflow-auto max-h-96 mb-4">
          <table className="min-w-full bg-white border border-gray-300 text-sm">
            <thead className="bg-gray-200 sticky top-0">
              <tr>
                <th 
                  className="px-3 py-2 border text-left cursor-pointer hover:bg-gray-300"
                  onClick={() => handleSort('pid')}
                >
                  PID {getSortIcon('pid')}
                </th>
                <th 
                  className="px-3 py-2 border text-left cursor-pointer hover:bg-gray-300"
                  onClick={() => handleSort('name')}
                >
                  进程名称 {getSortIcon('name')}
                </th>
                <th 
                  className="px-3 py-2 border text-right cursor-pointer hover:bg-gray-300"
                  onClick={() => handleSort('cpuUsage')}
                >
                  CPU使用率 {getSortIcon('cpuUsage')}
                </th>
                <th 
                  className="px-3 py-2 border text-right cursor-pointer hover:bg-gray-300"
                  onClick={() => handleSort('memoryKb')}
                >
                  内存占用 {getSortIcon('memoryKb')}
                </th>
                <th 
                  className="px-3 py-2 border text-right cursor-pointer hover:bg-gray-300"
                  onClick={() => handleSort('totalWrittenBytes')}
                >
                  历史写入 {getSortIcon('totalWrittenBytes')}
                </th>
                <th 
                  className="px-3 py-2 border text-right cursor-pointer hover:bg-gray-300"
                  onClick={() => handleSort('writtenBytes')}
                >
                  增量写入 {getSortIcon('writtenBytes')}
                </th>
                <th 
                  className="px-3 py-2 border text-right cursor-pointer hover:bg-gray-300"
                  onClick={() => handleSort('totalReadBytes')}
                >
                  历史读取 {getSortIcon('totalReadBytes')}
                </th>
                <th 
                  className="px-3 py-2 border text-right cursor-pointer hover:bg-gray-300"
                  onClick={() => handleSort('readBytes')}
                >
                  增量读取 {getSortIcon('readBytes')}
                </th>
              </tr>
            </thead>
            <tbody>
              {getSortedProcesses().map((proc, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-3 py-2 border font-mono">{proc.pid}</td>
                  <td className="px-3 py-2 border">{proc.name}</td>
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
              ))}
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
        </ul>
      </div>
    </div>
  );
};

export default Debug;