import { invoke } from '@tauri-apps/api/core';
import { message } from '@tauri-apps/plugin-dialog';
import { useState } from 'react';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');

  const addTodo = () => {
    if (!input.trim()) return;
    setTodos([...todos, { id: Date.now(), text: input.trim(), completed: false }]);
    setInput('');
  };

  const toggleTodo = (id: number) => {
    setTodos(prev =>
      prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const deleteTodo = (id: number) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  // 新增：生成 Markdown 内容
  const generateMarkdown = (): string => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    let md = `# ${dateStr} 任务列表\n\n`;
    md += `| 状态 | 任务 |\n|------|------|\n`;
    todos.forEach(todo => {
      const status = todo.completed ? '✅ 已完成' : '⬜ 未完成';
      // 注意转义 Markdown 中的特殊符号（如竖线）
      const text = todo.text.replace(/\|/g, '\\|');
      md += `| ${status} | ${text} |\n`;
    });
    return md;
  };

  // 新增：导出按钮点击事件
  const handleExport = async () => {
    if (todos.length === 0) {
      await message('列表为空，无需导出');
      return;
    }
    const markdown = generateMarkdown();
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    try {
      const savedPath = await invoke('export_markdown', {
        content: markdown,
        date: dateStr,
      });
      // 替换 alert('导出成功！文件保存在：' + savedPath);
  await message('导出成功！文件保存在：' + savedPath, { title: '提示' }); 
    } catch (error) {
      await message('导出失败：' + error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 to-neutral-900 p-8 flex justify-center">
      {/* 内联动画定义 */}
      <style>{`
        @keyframes checkmark {
          0%   { transform: scale(0) rotate(-45deg); opacity: 0; }
          50%  { transform: scale(1.3) rotate(5deg);  opacity: 1; }
          100% { transform: scale(1) rotate(0deg);    opacity: 1; }
        }
        .check-icon-animate {
          animation: checkmark 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        /* 完成状态的淡入背景渐变 */
        .todo-item-completing {
          transition: background-color 0.5s ease, border-color 0.5s ease, opacity 0.5s ease;
        }
      `}</style>

      <div className="max-w-lg w-full">
        <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="text-red-500">☐</span>
          Red Tasks
          <span className="text-sm text-neutral-500 ml-auto">todo</span>
        </h1>

        {/* 输入区域 */}
        <div className="flex gap-2 mb-6">
          <input
            className="flex-1 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTodo()}
            placeholder="输入新任务..."
          />
          <button
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
            onClick={handleExport}
          >
            导出为 Markdown
          </button>
        </div>

        {/* 任务列表 */}
        <ul className="space-y-3">
          {todos.map(todo => (
            <li
              key={todo.id}
              className={`
                todo-item-completing
                flex items-center gap-3 p-3 rounded-lg border
                ${todo.completed
                  ? 'bg-red-900/30 border-red-800/50 opacity-70'
                  : 'bg-neutral-800/60 border-neutral-700/50'
                }
              `}
            >
              {/* 自定义复选框 */}
              <label className="relative flex items-center justify-center w-6 h-6 flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                {/* 复选框外观 */}
                <div
                  className={`
                    w-6 h-6 rounded border-2 flex items-center justify-center
                    transition-all duration-300
                    ${todo.completed
                      ? 'bg-red-500 border-red-500 scale-110'
                      : 'bg-transparent border-neutral-500'
                    }
                  `}
                >
                  {todo.completed && (
                    <svg
                      className="w-5 h-5 text-white check-icon-animate"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </label>

              {/* 任务文本 */}
              <span
                className={`
                  flex-1 text-lg transition-all duration-500
                  ${todo.completed
                    ? 'line-through text-neutral-400'
                    : 'text-white'
                  }
                `}
              >
                {todo.text}
              </span>

              {/* 删除按钮 */}
              <button
                className="text-neutral-600 hover:text-red-400 transition-colors p-1"
                onClick={() => deleteTodo(todo.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>

        {todos.length === 0 && (
          <p className="text-neutral-500 text-center mt-8 text-sm">
            还没有任务，在输入框中添加吧 ✨
          </p>
        )}
      </div>
    </div>
  );
}
