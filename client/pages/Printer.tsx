/** src/components/DrillGround.tsx
 * @Author: Fofow
 * @Date: 2026/4/2
 * @Update: 2026/5/4
 * @Description: Printer - 调用打印机
 * @Copyright: Copyright (©) 2026 Fofow. All rights reserved.
 */

import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect } from "react";

interface PrintResult {
  success: boolean;
  message: string;
  preview?: string;
  error?: string;
}

interface TestConnectionResult {
  success: boolean;
  message: string;
  ip: string;
  port: number;
}

interface HealthCheckResult {
  status: string;
  service: string;
  timestamp: string;
}

const Printer: React.FC = () => {
  // 状态管理
  const [text, setText] = useState('');
  const [ip, setIp] = useState('192.168.101.8');
  const [port, setPort] = useState(9100);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PrintResult | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [healthStatus, setHealthStatus] = useState<HealthCheckResult | null>(null);

  // 组件加载时检查服务健康状态
  useEffect(() => {
    checkHealth();
  }, []);

  // 健康检查
  const checkHealth = async () => {
    try {
      const res = await invoke<HealthCheckResult>('health_check');
      setHealthStatus(res);
      console.log('服务健康状态:', res);
    } catch (error) {
      console.error('健康检查失败:', error);
    }
  };

  // 处理打印
  const handlePrint = async () => {
    // 验证输入
    if (!text.trim()) {
      alert('请输入要打印的文本内容');
      return;
    }

    setLoading(true);
    setResult(null);
    
    try {
      const res = await invoke<PrintResult>('print_text', {
        options: { 
          text: text.trim(), 
          ip: ip.trim(), 
          port: Number(port) 
        }
      });
      
      setResult(res);
      
      if (res.success) {
        // 打印成功
        console.log('打印成功:', res.message);
        // 可以在这里添加打印成功的音效或通知
      } else {
        // 打印失败
        console.error('打印失败:', res.message);
        alert(`打印失败: ${res.message}\n${res.error || ''}`);
      }
    } catch (error) {
      console.error('打印错误:', error);
      setResult({
        success: false,
        message: '系统调用失败',
        error: String(error)
      });
      alert('系统错误，请检查后端服务是否正常运行');
    } finally {
      setLoading(false);
    }
  };

  // 测试连接
  const handleTest = async () => {
    setLoading(true);
    setConnectionStatus('');
    
    try {
      const res = await invoke<TestConnectionResult>('test_connection', {
        options: { 
          ip: ip.trim(), 
          port: Number(port) 
        }
      });
      
      setConnectionStatus(res.message);
      alert(res.message);
      
      // 可以添加详细的日志
      console.log('连接测试结果:', {
        ip: res.ip,
        port: res.port,
        success: res.success,
        message: res.message
      });
    } catch (error) {
      console.error('测试错误:', error);
      const errorMsg = `测试失败: ${error}`;
      setConnectionStatus(errorMsg);
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // 清空表单
  const handleClear = () => {
    setText('');
    setResult(null);
    setConnectionStatus('');
  };

  // 设置默认打印机配置
  const setDefaultPrinter = () => {
    setIp('192.168.101.8');
    setPort(9100);
    alert('已恢复默认打印机配置');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 to-neutral-900 p-4">
      <div className="max-w-600px mx-auto px-4">
        {/* 健康状态显示 */}
        {healthStatus && (
          <div className={`p-3 rounded-lg mb-5 ${
            healthStatus.status === 'ok' 
              ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            <div className="text-sm">
              <strong>服务状态:</strong> {healthStatus.status === 'ok' ? '✅ 正常' : '❌ 异常'} <br />
              <strong>服务名称:</strong> {healthStatus.service} <br />
              <strong>最后检查:</strong> {new Date(healthStatus.timestamp).toLocaleString()}
            </div>
          </div>
        )}
        
        {/* 打印机配置 */}
        <div className="mb-5">
          <h3 className="text-red-300 mb-3">📡 打印机配置</h3>
          
          <div className="mb-4">
            <label className="block mb-1 text-neutral-400 text-sm">
              <strong>IP地址:</strong>
            </label>
            <input 
              type="text"
              value={ip} 
              onChange={(e) => setIp(e.target.value)} 
              placeholder="例如: 192.168.101.8"
              className="w-full px-3 py-2 rounded border border-red-500/30 bg-neutral-800 text-neutral-200 outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
          
          <div className="mb-4">
            <label className="block mb-1 text-neutral-400 text-sm">
              <strong>端口号:</strong>
            </label>
            <input 
              type="number" 
              value={port} 
              onChange={(e) => setPort(parseInt(e.target.value) || 9100)} 
              placeholder="例如: 9100"
              className="w-full px-3 py-2 rounded border border-red-500/30 bg-neutral-800 text-neutral-200 outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
        </div>
        
        {/* 打印内容 */}
        <div className="mb-5">
          <h3 className="text-red-300 mb-3">📝 打印内容</h3>
          <textarea 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            rows={6} 
            placeholder="请输入要打印的文本内容..."
            className="w-full px-3 py-2 rounded border border-red-500/30 bg-neutral-800 text-neutral-200 font-mono resize-y outline-none focus:ring-1 focus:ring-red-500"
          />
          <div className="text-xs text-neutral-500 mt-2">
            字符数: {text.length} | 预计打印长度: {Math.ceil(text.length / 32)} 行
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex gap-3 flex-wrap mb-5">
          <button 
            onClick={handleTest} 
            disabled={loading}
            className={`px-5 py-2 rounded text-white transition-all ${
              loading 
                ? 'bg-neutral-700 cursor-not-allowed opacity-60' 
                : 'bg-red-600 hover:bg-red-700 cursor-pointer'
            }`}
          >
            {loading ? '⏳ 测试中...' : '🔌 测试连接'}
          </button>
          
          <button 
            onClick={handlePrint} 
            disabled={loading || !text.trim()}
            className={`px-5 py-2 rounded text-white transition-all ${
              (loading || !text.trim()) 
                ? 'bg-neutral-700 cursor-not-allowed opacity-60' 
                : 'bg-red-600 hover:bg-red-700 cursor-pointer'
            }`}
          >
            {loading ? '⏳ 打印中...' : '🖨️ 打印'}
          </button>
          
          <button 
            onClick={handleClear}
            className="px-5 py-2 rounded bg-neutral-600 hover:bg-neutral-700 text-white transition-all cursor-pointer"
          >
            🗑️ 清空
          </button>
          
          <button 
            onClick={setDefaultPrinter}
            className="px-5 py-2 rounded bg-neutral-600 hover:bg-neutral-700 text-white transition-all cursor-pointer"
          >
            🔄 恢复默认
          </button>
        </div>
        
        {/* 连接状态显示 */}
        {connectionStatus && (
          <div className={`mb-5 p-3 rounded-lg ${
            connectionStatus.includes('正常') 
              ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            <strong>连接状态:</strong> {connectionStatus}
          </div>
        )}
        
        {/* 打印结果 */}
        {result && (
          <div className={`mt-5 p-4 rounded-lg border ${
            result.success 
              ? 'bg-green-500/10 border-green-500/20 text-green-400' 
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            <h3 className={`mb-2 ${result.success ? 'text-green-400' : 'text-red-400'}`}>
              {result.success ? '✅ 打印结果' : '❌ 错误信息'}
            </h3>
            <div className="text-neutral-300"><strong>消息:</strong> {result.message}</div>
            {result.preview && (
              <div className="text-neutral-300 mt-1"><strong>预览:</strong> {result.preview}</div>
            )}
            {result.error && (
              <div className="text-neutral-300 mt-1"><strong>错误详情:</strong> {result.error}</div>
            )}
          </div>
        )}
        
        {/* 使用说明 */}
        <div className="mt-5 p-4 rounded-lg bg-neutral-800/50 border border-red-500/20">
          <h4 className="text-red-300 mb-2">📖 使用说明</h4>
          <ul className="text-neutral-400 text-sm pl-5 space-y-1">
            <li>支持中文、英文、数字等字符打印</li>
            <li>打印机需支持 GB18030 编码</li>
            <li>默认端口为 9100（ESC/POS 协议）</li>
            <li>建议先点击"测试连接"确认打印机可达</li>
            <li>打印内容过长时建议分段打印</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Printer;