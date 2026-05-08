import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// 直接导入markdown文件（需要配置vite或webpack）
import testMarkdown from '../mock/markdown/test.md?raw';

const DocReader: React.FC = () => {
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // 直接使用导入的内容
      if (testMarkdown) {
        setMarkdownContent(testMarkdown);
      } else {
        throw new Error('文件内容为空');
      }
      setLoading(false);
    } catch (err) {
      console.error('读取失败:', err);
      setError('无法加载Markdown文件');
      setMarkdownContent('# 无法加载文档\n\n请检查文件路径：`../mock/markdown/test.md`');
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-red-50 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-5 min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-8 rounded-xl mb-8 shadow-md">
        <h1 className="text-3xl font-bold m-0">📖 文档阅读器</h1>
      </div>
      <div className="bg-white rounded-xl p-10 shadow-sm">
        <div className="prose prose-lg max-w-none prose-headings:border-b prose-headings:border-gray-200 prose-headings:pb-2 prose-headings:mb-4 prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-gray-700 prose-p:leading-relaxed prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-pink-600 prose-pre:bg-gray-900 prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-pre:code:bg-transparent prose-pre:code:text-gray-200 prose-table:border-collapse prose-table:w-full prose-table:my-4 prose-th:border prose-th:border-gray-300 prose-th:bg-gray-100 prose-th:p-2 prose-td:border prose-td:border-gray-300 prose-td:p-2 prose-blockquote:border-l-4 prose-blockquote:border-purple-500 prose-blockquote:my-4 prose-blockquote:py-2 prose-blockquote:px-5 prose-blockquote:bg-gray-50 prose-blockquote:text-gray-600 prose-blockquote:italic prose-ul:pl-6 prose-ul:my-2 prose-ol:pl-6 prose-ol:my-2 prose-li:my-1">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {markdownContent}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default DocReader;