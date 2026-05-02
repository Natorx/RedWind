import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect, useRef } from 'react';
import { useCommandStore } from '../stores/commandStore';

const SysCommands: React.FC = () => {
  const [path, setPath] = useState('');
  const [error, setError] = useState('');
  const [showCmdSuggestions, setShowCmdSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [successMsg, setSuccessMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { savedCommands, addCommand, removeCommand } = useCommandStore();

  // 调试：打印当前保存的命令
  useEffect(() => {
    console.log('Saved commands updated:', savedCommands);
  }, [savedCommands]);

  // 内置命令列表
  const builtinCommands = [
    {
      cmd: 'cmd:open',
      desc: '打开文件或文件夹',
      example: 'open C:\\Users',
      type: 'builtin' as const,
    },
    {
      cmd: 'cmd:calc',
      desc: '打开计算器',
      example: 'calc',
      type: 'builtin' as const,
    },
    {
      cmd: 'cmd:notepad',
      desc: '打开记事本',
      example: 'notepad',
      type: 'builtin' as const,
    },
    {
      cmd: 'cmd:explorer',
      desc: '打开文件资源管理器',
      example: 'explorer',
      type: 'builtin' as const,
    },
    {
      cmd: 'cmd:taskmgr',
      desc: '打开任务管理器',
      example: 'taskmgr',
      type: 'builtin' as const,
    },
    {
      cmd: 'cmd:control',
      desc: '打开控制面板',
      example: 'control',
      type: 'builtin' as const,
    },
    {
      cmd: 'cmd:msconfig',
      desc: '打开系统配置',
      example: 'msconfig',
      type: 'builtin' as const,
    },
    {
      cmd: 'cmd:regedit',
      desc: '打开注册表编辑器',
      example: 'regedit',
      type: 'builtin' as const,
    },
  ];

  // 将保存的命令转换为命令格式
  const getSavedCommands = () => {
    return savedCommands.map((cmd) => ({
      cmd: `save:${cmd.name}`,
      desc: cmd.description,
      example: cmd.path,
      type: 'saved' as const,
      id: cmd.id,
      name: cmd.name,
    }));
  };

  const allCommands = [...builtinCommands, ...getSavedCommands()];

  const filteredCommands = allCommands.filter((cmdItem) =>
    cmdItem.cmd.toLowerCase().includes(path.toLowerCase()),
  );

  useEffect(() => {
    if (path.startsWith('cmd:') || path.startsWith('save:')) {
      setShowCmdSuggestions(true);
      setSelectedIndex(0);
    } else {
      setShowCmdSuggestions(false);
    }
  }, [path]);

  // 保存命令 - 修复正则
  const handleSaveCommand = () => {
    console.log('handleSaveCommand called, path:', path); // 调试日志

    // 匹配 save:路径 (路径可以是任何内容，包括中文、空格等)
    if (path.startsWith('save:')) {
      const fullPath = path.substring(5).trim(); // 去掉 'save:' 前缀

      console.log('Extracted path:', fullPath); // 调试日志

      if (fullPath) {
        // 从路径中提取名称（最后一级）
        const name = fullPath.split(/[\\/]/).pop() || fullPath;

        // 检查是否已存在
        const exists = savedCommands.some((cmd) => cmd.name === name);
        if (exists) {
          setError(`命令 "${name}" 已存在`);
          setTimeout(() => setError(''), 2000);
          return;
        }

        const newCommand = {
          id: Date.now().toString(),
          name: name,
          path: fullPath,
          description: `打开 ${name}`,
          createdAt: new Date().toISOString(),
        };

        console.log('Adding new command:', newCommand); // 调试日志
        addCommand(newCommand);

        setSuccessMsg(`✅ 已保存: ${name} → ${fullPath}`);
        setPath(''); // 清空输入框
        setError('');

        setTimeout(() => setSuccessMsg(''), 3000);
        return;
      }
    }

    setError('格式错误，请使用 save:路径');
    setTimeout(() => setError(''), 2000);
  };

  const handleQuickOpenSaved = (commandName: string) => {
    const savedCmd = savedCommands.find((cmd) => cmd.name === commandName);
    if (savedCmd) {
      invoke('open_path', { path: savedCmd.path });
      setSuccessMsg(`🔓 正在打开: ${savedCmd.name}`);
      setTimeout(() => setSuccessMsg(''), 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showCmdSuggestions && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(
          (prev) =>
            (prev - 1 + filteredCommands.length) % filteredCommands.length,
        );
      } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
        e.preventDefault();
        const selected = filteredCommands[selectedIndex];
        if (selected.type === 'saved') {
          invoke('open_path', { path: selected.example });
          setSuccessMsg(`🔓 正在打开: ${selected.name}`);
          setTimeout(() => setSuccessMsg(''), 2000);
          setPath('');
          setShowCmdSuggestions(false);
        } else {
          setPath(selected.example);
          setShowCmdSuggestions(false);
        }
      } else if (e.key === 'Escape') {
        setShowCmdSuggestions(false);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (path.startsWith('save:')) {
        handleSaveCommand();
      } else {
        openPath();
      }
    }
  };

  const openPath = async () => {
    if (!path.trim()) {
      setError('请输入路径或网址');
      setTimeout(() => setError(''), 2000);
      return;
    }

    try {
      await invoke('open_path', { path });
      console.log('成功打开:', path);
      setPath('');
      setError('');
    } catch (err) {
      console.error('Failed to open path:', err);
      setError(typeof err === 'string' ? err : '打开失败，请检查路径是否正确');
      setTimeout(() => setError(''), 2000);
    }
  };

  const selectCommand = (cmdItem: (typeof allCommands)[0]) => {
    if (cmdItem.type === 'saved') {
      invoke('open_path', { path: cmdItem.example });
      setSuccessMsg(`🔓 正在打开: ${cmdItem.name}`);
      setTimeout(() => setSuccessMsg(''), 2000);
      setPath('');
      setShowCmdSuggestions(false);
    } else {
      setPath(cmdItem.example);
      setShowCmdSuggestions(false);
    }
    inputRef.current?.focus();
  };

  const handleDeleteSavedCommand = (
    e: React.MouseEvent,
    id: string,
    name: string,
  ) => {
    e.stopPropagation();
    removeCommand(id);
    setSuccessMsg(`🗑️ 已删除: ${name}`);
    setTimeout(() => setSuccessMsg(''), 2000);
  };

  return (
    <div className="w-full flex flex-col gap-2 relative">
      {successMsg && (
        <div className="fixed top-4 right-4 bg-green-500/20 border border-green-500 rounded-lg p-3 text-green-400 text-sm animate-in slide-in-from-top-2 fade-in duration-200 z-50">
          {successMsg}
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            autoFocus
            value={path}
            onChange={(e) => {
              setPath(e.target.value);
              setError('');
            }}
            onKeyDown={handleKeyDown}
            type="text"
            placeholder="输入 cmd: 查看命令 | save:路径 保存快捷命令..."
            className="
              w-full
              px-4
              py-3
              bg-neutral-900
              text-white
              placeholder:text-neutral-500
              rounded-xl
              border
              border-neutral-700
              outline-none
              transition-all
              duration-200
              focus:border-neutral-500
              focus:ring-2
              focus:ring-neutral-600
              focus:ring-opacity-50
              hover:border-neutral-600
              text-sm
              font-mono
            "
          />

          {showCmdSuggestions && filteredCommands.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-800 rounded-lg border border-neutral-700 overflow-hidden z-50 shadow-xl animate-in slide-in-from-top-2 fade-in duration-200 max-h-96 overflow-y-auto">
              {filteredCommands.map((cmdItem, index) => (
                <div
                  key={cmdItem.cmd}
                  className={`px-4 py-2 cursor-pointer transition-all duration-150 group ${
                    index === selectedIndex
                      ? 'bg-red-500/20 border-l-2 border-red-500'
                      : 'hover:bg-neutral-700'
                  }`}
                  onClick={() => selectCommand(cmdItem)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-sm ${
                            cmdItem.type === 'saved'
                              ? 'text-green-400'
                              : 'text-red-400'
                          }`}
                        >
                          {cmdItem.cmd}
                        </span>
                        <span className="text-neutral-500 text-xs">
                          {cmdItem.type === 'saved' ? '📌 已保存' : '⚡ 内置'}
                        </span>
                      </div>
                      <div className="text-neutral-400 text-xs mt-0.5">
                        {cmdItem.desc}
                      </div>
                      <div className="text-neutral-500 text-xs font-mono mt-0.5 truncate">
                        {cmdItem.example}
                      </div>
                    </div>
                    {cmdItem.type === 'saved' && 'id' in cmdItem && (
                      <button
                        onClick={(e) =>
                          handleDeleteSavedCommand(
                            e,
                            cmdItem.id as string,
                            (cmdItem as any).name,
                          )
                        }
                        className="ml-2 p-1 rounded hover:bg-red-500/20 text-neutral-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="w-30% bg-red-500/10 border border-red-500 rounded-md p-2 text-red-500 text-sm animate-in fade-in slide-in-from-right-2 duration-200">
            {error}
          </div>
        )}
      </div>

      {/* 快捷按钮区域 - 添加删除所有按钮 */}
      {savedCommands.length > 0 && !showCmdSuggestions && !path && (
        <div className="flex flex-wrap gap-2 mt-2 ml-0 items-center">
          <span className="text-xs text-neutral-500 mr-1">📌 快捷命令：</span>
          {savedCommands.map((cmd) => (
            <div key={cmd.id} className="flex items-center gap-1">
              <button
                onClick={() => handleQuickOpenSaved(cmd.name)}
                className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-green-400 transition-colors"
              >
                {cmd.name}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeCommand(cmd.id);
                  setSuccessMsg(`🗑️ 已删除: ${cmd.name}`);
                  setTimeout(() => setSuccessMsg(''), 2000);
                }}
                className="text-xs px-1 py-1 rounded bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors"
                title="删除"
              >
                ✕
              </button>
            </div>
          ))}
          {/* 删除所有按钮 */}
          <button
            onClick={() => {
              if (confirm('确定删除所有保存的命令吗？')) {
                useCommandStore.getState().clearCommands();
                setSuccessMsg('🗑️ 已删除所有命令');
                setTimeout(() => setSuccessMsg(''), 2000);
              }
            }}
            className="text-xs px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors"
          >
            清空所有
          </button>
        </div>
      )}
    </div>
  );
};

export default SysCommands;
