// DocReader.tsx
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { useDocStore } from '../stores/doc';

const DocReader: React.FC = () => {
  const { path, history, setPath, clearPath, clearHistory } = useDocStore();
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState<boolean>(true);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);

  // 读取文件（通过路径）
  const readFileFromPath = async (filePath: string) => {
    setLoading(true);
    setError(null);
    try {
      const fileName = filePath.split(/[\\/]/).pop() || '';
      setFileInfo({ name: fileName, size: 0 }); // size 无法从 readTextFile 获取
      const content = await readTextFile(filePath);
      setMarkdownContent(content);
      setShowIntro(false);
    } catch (err) {
      console.error('读取文件失败:', err);
      setError('无法读取文件内容，请确认文件编码为 UTF-8');
      setMarkdownContent('');
    } finally {
      setLoading(false);
    }
  };

  // 当 path 变化时自动读取（初始化、选择文件后、清除后）
  useEffect(() => {
    if (path) {
      readFileFromPath(path);
    } else {
      setMarkdownContent('');
      setFileInfo(null);
      setError(null);
      setShowIntro(true);
    }
  }, [path]);

  // 选择文件（系统对话框）
  const handleOpenFile = async () => {
    const selectedPath = await open({
      multiple: false,
      filters: [
        {
          name: 'Documents',
          extensions: [
            'md', 'txt', 'html', 'json', 'csv', 'xml', 'yml', 'yaml',
          ],
        },
      ],
    });
    if (selectedPath) {
      setPath(selectedPath);
    }
  };

  // 清除当前文件
  const handleClear = () => {
    clearPath();
  };

  // 点击历史记录项
  const handleHistorySelect = (filePath: string) => {
    setPath(filePath); // 自动触发 useEffect 读取
  };

  // 加载动画
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-950 to-neutral-900">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-neutral-400">正在读取文件...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-screen bg-gradient-to-br from-red-950 to-neutral-900 relative overflow-hidden">
      {/* 扫描动画 - 仅当无文件时显示 */}
      <div
        className={`absolute inset-0 pointer-events-none z-20 transition-opacity duration-500 ${
          showIntro && !path ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-scan-top" />
        <div className="absolute top-0 right-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-red-500 to-transparent animate-scan-right" />
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-scan-bottom" />
        <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-red-500 to-transparent animate-scan-left" />
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-red-500/80 rounded-tl-lg animate-pulse-glow" />
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-red-500/80 rounded-tr-lg animate-pulse-glow" />
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-red-500/80 rounded-bl-lg animate-pulse-glow" />
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-red-500/80 rounded-br-lg animate-pulse-glow" />
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col overflow-y-auto relative z-10 p-8">
        {/* 顶部操作栏 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-red-400">文档阅读器</h1>
          <div className="flex gap-3">
            <button
              onClick={handleOpenFile}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 transition-colors"
            >
              <Upload className="w-4 h-4" />
              选择文件
            </button>
            {path && (
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-neutral-400 transition-colors"
              >
                <X className="w-4 h-4" />
                清除
              </button>
            )}
          </div>
        </div>

        {/* 文件信息标签（当有文件时） */}
        {fileInfo && (
          <div className="flex gap-3 mb-6 flex-wrap">
            <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 backdrop-blur-sm">
              <span className="text-xs text-neutral-400">文件路径</span>
              <span className="ml-2 text-sm text-red-400 font-mono truncate max-w-xs">
                {path}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 backdrop-blur-sm">
              <span className="text-xs text-neutral-400">文件名</span>
              <span className="ml-2 text-sm text-red-400">{fileInfo.name}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 backdrop-blur-sm">
              <span className="text-xs text-neutral-400">字符数</span>
              <span className="ml-2 text-sm text-red-400">
                {markdownContent.length}
              </span>
            </div>
          </div>
        )}

        {/* 未选择文件时显示：左右布局 */}
        {!path && !error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex gap-8 w-full max-w-4xl">
              {/* 左侧：选择文档提示 */}
              <div
                className="flex-1 flex flex-col items-center justify-center gap-4 p-12 rounded-2xl border-2 border-dashed border-red-500/30 bg-red-500/5 cursor-pointer hover:bg-red-500/10 transition-colors"
                onClick={handleOpenFile}
              >
                <FileText className="w-16 h-16 text-red-400" />
                <p className="text-xl text-neutral-400">点击选择文档</p>
                <p className="text-sm text-neutral-500">
                  支持 .md .txt .html .json .csv 等文本格式
                </p>
              </div>

              {/* 右侧：最近打开的文件列表 */}
              {history.length > 0 && (
                <div className="w-80 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-red-300">最近打开</span>
                    <button
                      onClick={clearHistory}
                      className="px-2 py-1 cursor-pointer rounded-md bg-#3A1614 hover:bg-#3A1404 text-xs text-neutral-500 text-red-400 transition-colors"
                    >
                      清空
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto max-h-80 space-y-2">
                    {history.map((itemPath, index) => {
                      const fileName = itemPath.split(/[\\/]/).pop() || '';
                      const dir = itemPath.substring(0, itemPath.length - fileName.length).replace(/[/\\]$/, '') || '/';
                      const displayDir = dir.length > 35 ? dir.slice(0, 32) + '...' : dir;
                      return (
                        <button
                          key={index}
                          onClick={() => handleHistorySelect(itemPath)}
                          className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 bg-red-500/10 hover:bg-red-500/8 cursor-pointer transition-colors group"
                        >
                          <FileText className="w-4 h-4 text-red-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-red-200 truncate">{fileName}</div>
                            <div className="text-xs text-neutral-500 truncate">{displayDir}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="flex items-start gap-3 p-4 mb-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* 文档内容区域 */}
        {markdownContent && (
          <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-red-500/20 overflow-hidden min-h-[60vh]">
            <div className="p-8 text-red-200">
              <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {markdownContent}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 样式（保留你原来的全部样式） */}
      <style>{`
        .markdown-content h1 {
          font-size: 2rem;
          font-weight: bold;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
          border-bottom: 1px solid rgba(239, 68, 68, 0.3);
          padding-bottom: 0.5rem;
          color: #f87171;
        }
        
        .markdown-content h2 {
          font-size: 1.5rem;
          font-weight: bold;
          margin-top: 1.25rem;
          margin-bottom: 0.75rem;
          color: #f87171;
        }
        
        .markdown-content h3 {
          font-size: 1.25rem;
          font-weight: bold;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: #fca5a5;
        }
        
        .markdown-content p {
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
          line-height: 1.6;
          color: #e5e5e5;
        }
        
        .markdown-content code {
          background-color: rgba(239, 68, 68, 0.2);
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: monospace;
          font-size: 0.875rem;
          color: #fca5a5;
        }
        
        .markdown-content pre {
          background-color: #262626;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin-top: 1rem;
          margin-bottom: 1rem;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        
        .markdown-content pre code {
          background-color: transparent;
          padding: 0;
          color: #d4d4d4;
        }
        
        .markdown-content ul, .markdown-content ol {
          padding-left: 2rem;
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
        }
        
        .markdown-content li {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
          color: #e5e5e5;
        }
        
        .markdown-content table {
          border-collapse: collapse;
          width: 100%;
          margin-top: 1rem;
          margin-bottom: 1rem;
        }
        
        .markdown-content th, .markdown-content td {
          border: 1px solid rgba(239, 68, 68, 0.3);
          padding: 0.5rem;
          text-align: left;
        }
        
        .markdown-content th {
          background-color: rgba(239, 68, 68, 0.1);
          color: #f87171;
        }
        
        .markdown-content td {
          color: #e5e5e5;
        }
        
        .markdown-content blockquote {
          border-left: 4px solid #ef4444;
          padding-left: 1rem;
          margin-top: 1rem;
          margin-bottom: 1rem;
          color: #a3a3a3;
          font-style: italic;
        }
        
        .markdown-content a {
          color: #f87171;
          text-decoration: none;
        }
        
        .markdown-content a:hover {
          text-decoration: underline;
        }
        
        .markdown-content hr {
          border: none;
          border-top: 1px solid rgba(239, 68, 68, 0.3);
          margin-top: 1.5rem;
          margin-bottom: 1.5rem;
        }
        
        .markdown-content strong {
          color: #fca5a5;
          font-weight: bold;
        }
        
        @keyframes scan-top {
          0% { transform: translateX(-100%); opacity: 0; }
          50% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        @keyframes scan-right {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        @keyframes scan-bottom {
          0% { transform: translateX(100%); opacity: 0; }
          50% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(-100%); opacity: 0; }
        }
        @keyframes scan-left {
          0% { transform: translateY(100%); opacity: 0; }
          50% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-100%); opacity: 0; }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; box-shadow: 0 0 0px rgba(239,68,68,0); }
          50% { opacity: 1; box-shadow: 0 0 20px rgba(239,68,68,0.8); }
        }
        .animate-scan-top { animation: scan-top 1.25s ease-in-out infinite; }
        .animate-scan-right { animation: scan-right 1.25s ease-in-out infinite; }
        .animate-scan-bottom { animation: scan-bottom 1.25s ease-in-out infinite; }
        .animate-scan-left { animation: scan-left 1.25s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 1.25s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default DocReader;
