import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';

const SysCommands: React.FC = () => {
  const [path, setPath] = useState('');
  const [error, setError] = useState('');

  const openPath = async () => {
    if (!path.trim()) {
      setError('请输入路径或网址');
      return;
    }

    try {
      await invoke('open_path', { path });
      console.log('成功打开:', path);
      setError(''); // 成功时清空错误
    } catch (err) {
      console.error('Failed to open path:', err);
      setError(typeof err === 'string' ? err : '打开失败，请检查路径是否正确');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      openPath();
    }
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={path}
          onChange={(e) => {
            setPath(e.target.value);
            setError(''); // 输入时清空错误
          }}
          onKeyDown={handleKeyDown}
          type="text"
          placeholder="打开文件路径或网址..."
          className="
            mt-4
            ml-3
            w-70%
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
        {error && (
          <div className="w-30% bg-red-500/10 border border-red-500 rounded-md p-2 text-red-500 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default SysCommands;