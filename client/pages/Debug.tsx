import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';

interface ProcessInfo {
  pid: string;
  name: string;
  total_written_bytes: number;
  written_bytes: number;
  total_read_bytes: number;
  read_bytes: number;
}

const Debug: React.FC = () => {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);

  const parseProcessData = (rawData: string): ProcessInfo[] => {
    const lines = rawData.trim().split('\n');
    const parsed: ProcessInfo[] = [];
    
    for (const line of lines) {
      // 匹配格式: [1234] "process.exe" DiskUsage { total_written_bytes: 123, written_bytes: 0, total_read_bytes: 456, read_bytes: 0 }
      const match = line.match(/\[(\d+)\]\s+"([^"]+)"\s+DiskUsage\s+\{\s+total_written_bytes:\s+(\d+),\s+written_bytes:\s+(\d+),\s+total_read_bytes:\s+(\d+),\s+read_bytes:\s+(\d+)\s+\}/);
      
      if (match) {
        parsed.push({
          pid: match[1],
          name: match[2],
          total_written_bytes: parseInt(match[3]),
          written_bytes: parseInt(match[4]),
          total_read_bytes: parseInt(match[5]),
          read_bytes: parseInt(match[6]),
        });
      }
    }
    
    return parsed;
  };

  const handleGetProcesses = () => {
    invoke<string>('get_process')
      .then((result) => {
        const parsed = parseProcessData(result);
        setProcesses(parsed);
        console.log('进程列表:', parsed);
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

  return (
    <div className="p-4">
      <button 
        onClick={handleGetProcesses}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4"
      >
        获取进程列表
      </button>
      
      {processes.length > 0 && (
        <div className="overflow-auto max-h-96">
          <table className="min-w-full bg-white border border-gray-300">
            <thead className="bg-gray-200 sticky top-0">
              <tr>
                <th className="px-4 py-2 border text-left">PID</th>
                <th className="px-4 py-2 border text-left">进程名</th>
                <th className="px-4 py-2 border text-right">总计写入</th>
                <th className="px-4 py-2 border text-right">本次写入</th>
                <th className="px-4 py-2 border text-right">总计读取</th>
                <th className="px-4 py-2 border text-right">本次读取</th>
              </tr>
            </thead>
            <tbody>
              {processes.map((proc, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border font-mono">{proc.pid}</td>
                  <td className="px-4 py-2 border">{proc.name}</td>
                  <td className="px-4 py-2 border text-right font-mono">{formatBytes(proc.total_written_bytes)}</td>
                  <td className="px-4 py-2 border text-right font-mono">{formatBytes(proc.written_bytes)}</td>
                  <td className="px-4 py-2 border text-right font-mono">{formatBytes(proc.total_read_bytes)}</td>
                  <td className="px-4 py-2 border text-right font-mono">{formatBytes(proc.read_bytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Debug;