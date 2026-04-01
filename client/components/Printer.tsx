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
    text: '测试打印内容\n这是第二行\n时间：${currentTime}'
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

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 替换文本中的时间占位符
  const replaceTimePlaceholder = (text: string): string => {
    const currentTime = new Date().toLocaleString('zh-CN');
    return text.replace(/\${currentTime}/g, currentTime);
  };

  // 测试打印机连接
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
          message: `✅ 连接成功！打印机 ${formData.ip}:${formData.port} 在线`
        });
      } else {
        setConnectionTest({
          testing: false,
          result: false,
          message: `❌ 连接失败：${data.message || '无法连接到打印机'}`
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

  // 执行打印
  const handlePrint = async () => {
    // 重置结果状态
    setResult({ type: null, message: '', details: '' });
    setLoading(true);

    // 准备打印文本（替换时间占位符）
    const printText = replaceTimePlaceholder(formData.text);

    // 验证打印内容
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
          details: data.preview ? `打印内容预览：${data.preview.replace(/\n/g, ' ')}` : ''
        });
        
        // 可选：打印成功后清空连接测试状态
        setConnectionTest({
          testing: false,
          result: null,
          message: ''
        });
      } else {
        setResult({
          type: 'error',
          message: data.message || '打印失败',
          details: data.error || '请检查打印机连接和设置'
        });
      }
    } catch (error: any) {
      console.error('打印请求失败:', error);
      setResult({
        type: 'error',
        message: '网络连接错误',
        details: error.message || '无法连接到打印服务器，请确保后端服务已启动'
      });
    } finally {
      setLoading(false);
    }
  };

  // 清除结果
  const clearResult = () => {
    setResult({ type: null, message: '', details: '' });
  };

  // 快速填充测试文本
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

  // 清空表单
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-3xl mx-auto">
        {/* 头部 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <span className="text-3xl">🖨️</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">打印机控制台</h1>
          <p className="text-gray-600">通过 TCP/IP 直连打印机，支持 GB18030 编码</p>
        </div>

        {/* 主卡片 */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 space-y-6">
            {/* 打印机设置区域 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                <span className="text-lg">⚙️</span>
                <h2 className="text-lg font-semibold text-gray-700">打印机设置</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    打印机 IP 地址
                  </label>
                  <input
                    type="text"
                    name="ip"
                    value={formData.ip}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="192.168.101.8"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    端口号
                  </label>
                  <input
                    type="number"
                    name="port"
                    value={formData.port}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="9100"
                  />
                </div>
              </div>

              {/* 测试连接按钮 */}
              <button
                onClick={testConnection}
                disabled={connectionTest.testing}
                className="w-full py-2 rounded-lg font-medium text-sm transition-all border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connectionTest.testing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    测试中...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    🔌 测试打印机连接
                  </span>
                )}
              </button>

              {/* 连接测试结果显示 */}
              {connectionTest.message && (
                <div className={`p-3 rounded-lg text-sm ${
                  connectionTest.result === true 
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : connectionTest.result === false
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                }`}>
                  {connectionTest.message}
                </div>
              )}
            </div>

            {/* 打印内容区域 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  <h2 className="text-lg font-semibold text-gray-700">打印内容</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={fillTestText}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    填充测试文本
                  </button>
                  <button
                    onClick={clearForm}
                    className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                  >
                    清空
                  </button>
                </div>
              </div>
              
              <div>
                <textarea
                  name="text"
                  value={formData.text}
                  onChange={handleInputChange}
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono text-sm"
                  placeholder="输入要打印的内容...
支持多行文本
支持中文

提示：可以使用 ${'${currentTime}'} 作为当前时间的占位符"
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-500">
                    💡 提示：可以使用 {'${currentTime}'} 作为当前时间的占位符
                  </p>
                  <p className="text-xs text-gray-400">
                    字数：{formData.text.length}
                  </p>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handlePrint}
                disabled={loading}
                className={`flex-1 py-3 rounded-lg font-medium text-white transition-all transform ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-98 shadow-md hover:shadow-lg'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    正在发送打印任务...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    🖨️ 开始打印
                  </span>
                )}
              </button>
              
              {result.type && (
                <button
                  onClick={clearResult}
                  className="px-4 py-3 rounded-lg font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition"
                >
                  清除结果
                </button>
              )}
            </div>

            {/* 结果显示区域 */}
            {result.type && (
              <div
                className={`mt-4 p-4 rounded-lg border-l-4 transition-all ${
                  result.type === 'success'
                    ? 'bg-green-50 border-green-500'
                    : 'bg-red-50 border-red-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {result.type === 'success' ? (
                      <svg className="w-5 h-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`font-semibold ${result.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                      {result.type === 'success' ? '✅ 打印成功！' : '❌ 打印失败'}
                    </div>
                    <div className={`text-sm mt-1 ${result.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                      {result.message}
                    </div>
                    {result.details && (
                      <div className={`text-xs mt-2 pt-2 border-t ${result.type === 'success' ? 'border-green-200 text-green-600' : 'border-red-200 text-red-600'}`}>
                        {result.details}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 底部信息 */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-xs text-gray-500 text-center">
            <div>后端服务：{API_BASE_URL}</div>
            <div className="mt-1">
              打印机：{formData.ip}:{formData.port} | 支持 GB18030 编码
            </div>
          </div>
        </div>

        {/* 使用提示 */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">📌 使用提示</h3>
          <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
            <li>确保打印机已开机并连接到网络</li>
            <li>确认打印机 IP 地址和端口号（默认 9100）正确</li>
            <li>建议先点击「测试打印机连接」确认连通性</li>
            <li>支持 GB18030 编码，可正常打印中文</li>
            <li>使用 {'${currentTime}'} 占位符可自动替换为当前时间</li>
            <li>确保 NestJS 后端服务已启动（默认端口 3000）</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Printer;