// src/components/Terminal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
// import { listen } from '@tauri-apps/api/event';

interface TerminalProps {
  className?: string;
}

interface CommandHistory {
  command: string;
  output: string;
  timestamp: Date;
  isError?: boolean;
}

const Terminal: React.FC<TerminalProps> = ({ className }) => {
  const [currentDir, setCurrentDir] = useState<string>('');
  const [input, setInput] = useState<string>('');
  const [history, setHistory] = useState<CommandHistory[]>([]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 初始化获取当前目录
  useEffect(() => {
    fetchCurrentDir();
    
    // 添加初始欢迎信息
    setHistory([
      {
        command: 'system',
        output: '🚀 Tauri 终端已启动',
        timestamp: new Date(),
      },
      {
        command: 'system',
        output: '输入 "help" 查看可用命令',
        timestamp: new Date(),
      },
      {
        command: 'system',
        output: 'tip：由于权限等原因，无法使用实时交互，需要保持会话，高级控制权限的命令',
        timestamp: new Date(),
      }
    ]);
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  const fetchCurrentDir = async () => {
    try {
      // 使用 pwd 命令获取当前目录
      const result = await executeShellCommand('cd');
      setCurrentDir(result || process.cwd());
    } catch (error) {
      console.error('获取目录失败:', error);
      setCurrentDir(process.cwd());
    }
  };

  // 简化的命令执行函数
  const executeShellCommand = async (cmd: string): Promise<string> => {
    try {
      const result = await invoke<string>('execute_shell', { cmd });
      return result;
    } catch (error: any) {
      throw new Error(error.toString());
    }
  };

  // 简化的 Windows 命令执行
  const executeWindowsCommand = async (cmd: string): Promise<string> => {
    try {
      const result = await invoke<string>('execute_windows_command', { cmd });
      return result;
    } catch (error: any) {
      throw new Error(error.toString());
    }
  };

  const addToHistory = (item: CommandHistory) => {
    setHistory(prev => [...prev, item]);
  };

  const executeCommand = async (cmd: string) => {
    if (!cmd.trim()) return;

    // 添加命令到历史记录
    addToHistory({
      command: cmd,
      output: '执行中...',
      timestamp: new Date(),
    });

    setIsExecuting(true);

    try {
      // 处理特殊命令
      if (cmd.startsWith('cd ')) {
        const path = cmd.substring(3).trim();
        try {
          // Windows 使用 cd /d 命令
          const result = await executeWindowsCommand(`cd /d "${path}" && cd`);
          setCurrentDir(result.trim());
          addToHistory({
            command: cmd,
            output: `切换到目录: ${result.trim()}`,
            timestamp: new Date(),
          });
        } catch (error: any) {
          addToHistory({
            command: cmd,
            output: `错误: ${error.message}`,
            timestamp: new Date(),
            isError: true,
          });
        }
      } else if (cmd === 'clear' || cmd === 'cls') {
        setHistory([]);
      } else if (cmd === 'help') {
        const helpText = `
可用命令:
  cd <目录>      - 切换目录
  ls / dir      - 列出文件
  pwd           - 显示当前目录
  clear / cls   - 清屏
  help          - 显示帮助
  exit          - 退出终端

其他系统命令也可直接使用
        `.trim();
        addToHistory({
          command: cmd,
          output: helpText,
          timestamp: new Date(),
        });
      } else if (cmd === 'exit') {
        window.close();
      } else if (cmd === 'pwd') {
        const result = await executeShellCommand('cd');
        addToHistory({
          command: cmd,
          output: result,
          timestamp: new Date(),
        });
      } else if (cmd === 'ls' || cmd === 'dir') {
        const result = await executeShellCommand(cmd);
        addToHistory({
          command: cmd,
          output: result,
          timestamp: new Date(),
        });
      } else {
        // 使用简化命令执行
        const result = await executeShellCommand(cmd);
        addToHistory({
          command: cmd,
          output: result,
          timestamp: new Date(),
        });
      }
    } catch (error: any) {
      addToHistory({
        command: cmd,
        output: `错误: ${error.message}`,
        timestamp: new Date(),
        isError: true,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isExecuting) {
      executeCommand(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      // TODO: 实现自动补全
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      // TODO: 实现历史命令导航
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setHistory([]);
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 终端标题栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="ml-2 text-sm font-medium">终端</span>
        </div>
        <div className="text-xs opacity-75 truncate max-w-md">
          {currentDir || '未知目录'}
        </div>
      </div>

      {/* 终端内容区域 */}
      <div
        ref={terminalRef}
        className="flex-1 bg-black text-green-400 font-mono text-sm p-4 overflow-y-auto"
      >
        {history.map((item, index) => (
          <div key={index} className="mb-2">
            {item.command !== 'system' && item.command !== 'output' && item.command !== 'error' && (
              <div className="flex">
                <span className="text-blue-400 mr-2">$</span>
                <span className="text-cyan-300">{item.command}</span>
              </div>
            )}
            <div className={`ml-4 whitespace-pre-wrap ${item.isError ? 'text-red-400' : 'text-gray-300'}`}>
              {item.output}
            </div>
          </div>
        ))}
        
        {/* 输入提示行 */}
        <form onSubmit={handleSubmit} className="flex items-center mt-2">
          <div className="flex items-center">
            <span className="text-blue-400 mr-2">$</span>
            <span className="text-green-400 mr-2">{currentDir.split('\\').pop() || '~'}</span>
            <span className="text-white mr-1">&gt;</span>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-white outline-none ml-1 border-none"
            placeholder={isExecuting ? "命令执行中..." : "输入命令..."}
            disabled={isExecuting}
            autoFocus
          />
          {isExecuting && (
            <div className="ml-2 w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
          )}
        </form>
      </div>

      {/* 状态栏 */}
      <div className="px-4 py-2 bg-gray-900 text-gray-400 text-xs rounded-b-lg">
        <div className="flex justify-between">
          <div>
            命令数: {history.filter(h => !['system', 'output', 'error'].includes(h.command)).length}
          </div>
          <div>
            {isExecuting ? '执行中...' : '就绪'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terminal;
