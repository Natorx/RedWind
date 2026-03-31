import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

const APITest: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [rustResponse, setRustResponse] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);


  // 测试 3: Rust 命令调用
  const testRustCommand = async () => {
    setLoading(true);
    try {
      const response = await invoke('greet', { name: 'Tauri User' });
      setRustResponse(`Rust 响应: ${response}`);
    } catch (error) {
      setRustResponse(`错误: ${error}\n请确保 Rust 后端已添加 greet 命令`);
    } finally {
      setLoading(false);
    }
  };

  // 测试 4: 写入测试文件
  const testFileWrite = async () => {
    setLoading(true);
    try {
      await invoke('write_file', {
        path: './tauri_test.txt',
        contents: `Tauri 测试文件\n生成时间: ${new Date().toLocaleString()}`
      });
      setFileContent('测试文件已创建: ./tauri_test.txt');
    } catch (error) {
      setFileContent(`写入失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 测试 5: 读取测试文件
  const testFileRead = async () => {
    setLoading(true);
    try {
      const content = await invoke('read_file', {
        path: './tauri_test.txt'
      });
      setFileContent(`文件内容:\n${content}`);
    } catch (error) {
      setFileContent(`读取失败: ${error}\n请先创建测试文件`);
    } finally {
      setLoading(false);
    }
  };

  // 重置所有结果
  const resetResults = () => {
    setSystemInfo('');
    setFileContent('');
    setSelectedFile('');
    setRustResponse('');
  };

  return (
    <div className="api-test-container">
      <div className="test-header">
        <h2>Tauri 系统 API 测试</h2>
        <p className="subtitle">验证 Tauri 与系统交互功能</p>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">⏳</div>
          <p>处理中...</p>
        </div>
      )}

      <div className="test-controls">

        <div className="test-section">
          <h3>📁 文件操作</h3>
          <div className="button-group">
            <button 
              className="test-btn"
              onClick={testFileWrite}
              disabled={loading}
            >
              创建测试文件
            </button>
            <button 
              className="test-btn"
              onClick={testFileRead}
              disabled={loading}
            >
              读取测试文件
            </button>
          </div>
          {fileContent && (
            <div className="result-box">
              <pre>{fileContent}</pre>
            </div>
          )}
          {selectedFile && (
            <p className="file-path">当前文件: {selectedFile}</p>
          )}
        </div>

        <div className="test-section">
          <h3>⚙️ Rust 通信</h3>
          <button 
            className="test-btn primary"
            onClick={testRustCommand}
            disabled={loading}
          >
            调用 Rust 命令
          </button>
          {rustResponse && (
            <div className="result-box">
              <pre>{rustResponse}</pre>
            </div>
          )}
        </div>

        <div className="test-actions">
          <button 
            className="test-btn reset"
            onClick={resetResults}
            disabled={loading}
          >
            清空结果
          </button>
        </div>

        <div className="test-info">
          <h4>📝 测试说明</h4>
          <ul>
            <li>确保已配置 <code>tauri.conf.json</code> 权限</li>
            <li>Rust 命令需要在 <code>main.rs</code> 中定义</li>
            <li>文件操作需要相应的文件系统权限</li>
            <li>首次运行可能需要安装插件</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default APITest;
