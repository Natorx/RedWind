import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';

interface NetworkDevice {
  ip: string;
  mac: string | null;
  hostname: string | null;
  status: string;
  response_time: number | null;
}

const NetworkScanner: React.FC = () => {
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const startScan = async () => {
    if (isScanning) return;
    
    setIsScanning(true);
    setDevices([]);
    
    try {
      const result = await invoke<NetworkDevice[]>('scan_network');
      setDevices(result);
    } catch (error) {
      console.error('扫描失败:', error);
      alert('扫描失败: ' + error);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <button
          onClick={startScan}
          disabled={isScanning}
          className={`px-4 py-2 rounded transition-colors flex items-center gap-2 ${
            isScanning 
              ? 'bg-gray-500 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white`}
        >
          {isScanning ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              扫描中... (需要 30-60 秒)
            </>
          ) : (
            '开始扫描局域网'
          )}
        </button>
      </div>
      
      <div className="mt-4">
        <h2 className="text-lg font-semibold mb-2">发现的设备 ({devices.length})</h2>
        {devices.length === 0 && !isScanning && (
          <div className="text-neutral-500 text-center py-8">
            暂无设备，点击上方按钮开始扫描
          </div>
        )}
        <div className="space-y-2 mt-2">
          {devices.map((device, index) => (
            <div key={index} className="p-3 bg-neutral-800 rounded-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-green-400">{device.ip}</span>
                  {device.hostname && (
                    <span className="text-xs text-neutral-400">({device.hostname})</span>
                  )}
                </div>
                <span className="text-xs text-neutral-400">
                  {device.response_time ? `${device.response_time}ms` : '超时'}
                </span>
              </div>
              {device.mac && (
                <div className="text-xs text-neutral-500 mt-1">MAC: {device.mac}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NetworkScanner;