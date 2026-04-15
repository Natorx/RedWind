/**src/components/Printer.tsx
 * @Author: Fofow
 * @Date: 2026/4/2
 * @Description: 
 * @Copyright: Copyright (©)}) 2026 Fofow. All rights reserved.
 */
import React, { useState } from 'react';

interface PrintResult {
  type: 'success' | 'error' | null;
  message: string;
  details?: string;
}

const Printer: React.FC = () => {
  const [formData, setFormData] = useState({
    ip: '192.168.101.8',
    port: '9100',
    text: '时间：${currentTime}\n-------------------'
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PrintResult>({
    type: null,
    message: '',
    details: ''
  });
  const [connectionTest, setConnectionTest] = useState<{
    testing: boolean;
    result: boolean | null;
    message: string;
  }>({
    testing: false,
    result: null,
    message: ''
  });

  const API_BASE_URL = 'http://localhost:3000/api';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const replaceTimePlaceholder = (text: string): string => {
    const currentTime = new Date().toLocaleString('zh-CN');
    return text.replace(/\${currentTime}/g, currentTime);
  };

  const testConnection = async () => {
    setConnectionTest({
      testing: true,
      result: null,
      message: '正在测试连接...'
    });

    try {
      const response = await fetch(
        `${API_BASE_URL}/app/test?ip=${encodeURIComponent(formData.ip)}&port=${formData.port}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setConnectionTest({
          testing: false,
          result: true,
          message: `✅ 连接成功！`
        });
      } else {
        setConnectionTest({
          testing: false,
          result: false,
          message: `❌ 连接失败：${data.message || '无法连接'}`
        });
      }
    } catch (error: any) {
      setConnectionTest({
        testing: false,
        result: false,
        message: `❌ 连接失败：${error.message || '网络错误'}`
      });
    }
  };

  const handlePrint = async () => {
    setResult({ type: null, message: '', details: '' });
    setLoading(true);

    const printText = replaceTimePlaceholder(formData.text);

    if (!printText.trim()) {
      setResult({
        type: 'error',
        message: '打印内容不能为空',
        details: '请在文本框中输入要打印的内容'
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/app/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: printText,
          ip: formData.ip,
          port: parseInt(formData.port) || 9100,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult({
          type: 'success',
          message: data.message || '打印任务已成功发送',
          details: ''
        });
        
        setConnectionTest({
          testing: false,
          result: null,
          message: ''
        });
      } else {
        setResult({
          type: 'error',
          message: data.message || '打印失败',
          details: data.error || '请检查打印机连接'
        });
      }
    } catch (error: any) {
      console.error('打印请求失败:', error);
      setResult({
        type: 'error',
        message: '网络连接错误',
        details: error.message || '请确保后端服务已启动'
      });
    } finally {
      setLoading(false);
    }
  };

  const clearResult = () => {
    setResult({ type: null, message: '', details: '' });
  };

  const fillTestText = () => {
    setFormData(prev => ({
      ...prev,
      text: `===== 测试打印 =====
时间：${'${currentTime}'}
打印机型号：热敏/票据打印机
这是中文测试内容
包含换行和特殊字符！
------------------
感谢使用打印服务
==================`
    }));
  };

  const clearForm = () => {
    setFormData({
      ip: '192.168.101.8',
      port: '9100',
      text: ''
    });
    clearResult();
    setConnectionTest({
      testing: false,
      result: null,
      message: ''
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 紧凑头部 */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🖨️</span>
            <div>
              <h1 className="text-xl font-bold text-gray-800">打印机控制台</h1>
              <p className="text-xs text-gray-500">TCP/IP 直连 | GB18030 编码</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">后端服务</p>
            <p className="text-xs font-mono text-gray-500">{API_BASE_URL}</p>
          </div>
        </div>

        {/* 左右两栏布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 左侧：配置和打印区域 */}
          <div className="space-y-4">
            {/* 打印机配置卡片 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">⚙️</span>
                  <h2 className="text-sm font-semibold text-gray-700">连接配置</h2>
                </div>
              </div>
              <div className="p-3 space-y-2.5">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">IP 地址</label>
                    <input
                      type="text"
                      name="ip"
                      value={formData.ip}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="192.168.101.8"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">端口</label>
                    <input
                      type="number"
                      name="port"
                      value={formData.port}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="9100"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={testConnection}
                      disabled={connectionTest.testing}
                      className="px-3 py-1 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition"
                    >
                      {connectionTest.testing ? '测试中' : '测试'}
                    </button>
                  </div>
                </div>
                {connectionTest.message && (
                  <div className={`text-xs p-1.5 rounded ${
                    connectionTest.result === true ? 'text-green-700 bg-green-50' :
                    connectionTest.result === false ? 'text-red-700 bg-red-50' : 'text-blue-700 bg-blue-50'
                  }`}>
                    {connectionTest.message}
                  </div>
                )}
              </div>
            </div>

            {/* 打印内容卡片 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">📝</span>
                  <h2 className="text-sm font-semibold text-gray-700">打印内容</h2>
                </div>
                <div className="flex gap-2">
                  <button onClick={fillTestText} className="text-xs text-blue-600 hover:text-blue-700">填充示例</button>
                  <button onClick={clearForm} className="text-xs text-gray-500 hover:text-gray-700">清空</button>
                </div>
              </div>
              <div className="p-3">
                <textarea
                  name="text"
                  value={formData.text}
                  onChange={handleInputChange}
                  rows={5}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded font-mono focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="输入要打印的内容..."
                />
                <div className="flex justify-between items-center mt-1.5">
                  <p className="text-[10px] text-gray-400">💡 使用 {'${currentTime}'} 插入时间</p>
                  <p className="text-[10px] text-gray-400">{formData.text.length} 字</p>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <button
              onClick={handlePrint}
              disabled={loading}
              className={`w-full py-2 rounded-md font-medium text-sm transition ${
                loading
                  ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  发送中...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">🖨️ 开始打印</span>
              )}
            </button>

            {/* 打印结果 */}
            {result.type && (
              <div className={`p-3 rounded-md ${
                result.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start gap-2">
                  <span className="text-sm">{result.type === 'success' ? '✅' : '❌'}</span>
                  <div className="flex-1">
                    <p className={`text-xs font-medium ${result.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                      {result.message}
                    </p>
                    {result.details && (
                      <p className="text-[11px] mt-1 text-gray-600">{result.details}</p>
                    )}
                  </div>
                  <button onClick={clearResult} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                </div>
              </div>
            )}
          </div>

          {/* 右侧：提示和状态区域 */}
          <div className="space-y-4">
            {/* 当前状态卡片 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">📊</span>
                  <h2 className="text-sm font-semibold text-gray-700">当前状态</h2>
                </div>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">目标打印机：</span>
                  <span className="font-mono text-gray-700">{formData.ip}:{formData.port}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">连接状态：</span>
                  <span className={connectionTest.result === true ? 'text-green-600' : connectionTest.result === false ? 'text-red-600' : 'text-gray-400'}>
                    {connectionTest.result === true ? '● 在线' : connectionTest.result === false ? '● 离线' : '○ 未测试'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">编码格式：</span>
                  <span className="text-gray-700">GB18030</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">打印内容长度：</span>
                  <span className="text-gray-700">{formData.text.length} 字符</span>
                </div>
              </div>
            </div>

            {/* 使用提示卡片 */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 overflow-hidden">
              <div className="bg-blue-100/50 px-3 py-2 border-b border-blue-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">💡</span>
                  <h2 className="text-sm font-semibold text-blue-900">使用提示</h2>
                </div>
              </div>
              <div className="p-3">
                <ul className="space-y-1.5">
                  <li className="text-xs text-blue-800 flex items-start gap-1.5">
                    <span>•</span>
                    <span>确保打印机已开机并连接到网络</span>
                  </li>
                  <li className="text-xs text-blue-800 flex items-start gap-1.5">
                    <span>•</span>
                    <span>确认 IP 地址和端口号（默认 9100）正确</span>
                  </li>
                  <li className="text-xs text-blue-800 flex items-start gap-1.5">
                    <span>•</span>
                    <span>先点击「测试」按钮确认连通性</span>
                  </li>
                  <li className="text-xs text-blue-800 flex items-start gap-1.5">
                    <span>•</span>
                    <span>支持 GB18030 编码，可正常打印中文</span>
                  </li>
                  <li className="text-xs text-blue-800 flex items-start gap-1.5">
                    <span>•</span>
                    <span>使用 {'${currentTime}'} 自动替换为当前时间</span>
                  </li>
                  <li className="text-xs text-blue-800 flex items-start gap-1.5">
                    <span>•</span>
                    <span>确保后端服务已启动（端口 3000）</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 快捷操作卡片 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">⚡</span>
                  <h2 className="text-sm font-semibold text-gray-700">快捷操作</h2>
                </div>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, text: prev.text + '\n' }))}
                    className="text-xs px-2 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
                  >
                    添加换行
                  </button>
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, text: prev.text + '${currentTime}' }))}
                    className="text-xs px-2 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
                  >
                    插入时间
                  </button>
                  <button
                    onClick={() => {
                      const currentText = formData.text;
                      setFormData(prev => ({ ...prev, text: currentText + '\n------------------\n' }));
                    }}
                    className="text-xs px-2 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
                  >
                    添加分隔线
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('确认清空所有内容？')) {
                        clearForm();
                      }
                    }}
                    className="text-xs px-2 py-1.5 border border-red-200 rounded-md hover:bg-red-50 text-red-600"
                  >
                    全部重置
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Printer;