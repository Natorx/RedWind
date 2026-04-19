// src/components/Server.tsx
import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

const ServerControl: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const startServer = async () => {
    setLoading(true);
    setMessage('');
    try {
      const result = await invoke<string>('start_server');
      setMessage(result);
      setMessageType('success');
      setIsRunning(true);
    } catch (error) {
      const errorMsg = typeof error === 'string' ? error : String(error);
      setMessage(`启动失败: ${errorMsg}`);
      setMessageType('error');
      console.error('Failed to start server:', error);
    } finally {
      setLoading(false);
    }
  };

  const stopServer = async () => {
    setLoading(true);
    setMessage('');
    try {
      const result = await invoke<string>('stop_server');
      setMessage(result);
      setMessageType('success');
      setIsRunning(false);
    } catch (error) {
      const errorMsg = typeof error === 'string' ? error : String(error);
      setMessage(`停止失败: ${errorMsg}`);
      setMessageType('error');
      console.error('Failed to stop server:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkServerStatus = async () => {
    try {
      const running = await invoke<boolean>('get_server_status');
      setIsRunning(running);
    } catch (error) {
      console.error('Failed to check server status:', error);
    }
  };

  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 2000); // 2秒检查一次
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* 标题 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">NestJS 服务管理</h2>
            <p className="text-sm text-gray-500">管理本地后端服务 (端口: 3000)</p>
          </div>
        </div>

        {/* 状态显示 */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="font-medium text-gray-700">
                服务状态: 
                <span className={isRunning ? 'text-green-600 ml-2' : 'text-gray-500 ml-2'}>
                  {isRunning ? '运行中' : '未启动'}
                </span>
              </span>
            </div>
            {isRunning && (
              <div className="text-xs text-gray-400">
                http://localhost:3000
              </div>
            )}
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={startServer}
            disabled={isRunning || loading}
            className={`
              flex-1 px-6 py-3 rounded-lg font-medium transition-all
              ${isRunning || loading
                ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                : 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
              }
            `}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                启动中...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                启动服务
              </span>
            )}
          </button>

          <button
            onClick={stopServer}
            disabled={!isRunning || loading}
            className={`
              flex-1 px-6 py-3 rounded-lg font-medium transition-all
              ${!isRunning || loading
                ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                : 'bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg'
              }
            `}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                停止中...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                停止服务
              </span>
            )}
          </button>
        </div>

        {/* 消息提示 */}
        {message && (
          <div className={`
            p-3 rounded-lg text-sm transition-all
            ${messageType === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : ''}
            ${messageType === 'error' ? 'bg-red-100 text-red-700 border border-red-200' : ''}
            ${messageType === 'info' ? 'bg-blue-100 text-blue-700 border border-blue-200' : ''}
          `}>
            <div className="flex items-center gap-2">
              {messageType === 'success' && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {messageType === 'error' && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span>{message}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerControl;