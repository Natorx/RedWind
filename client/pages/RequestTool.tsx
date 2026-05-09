/**src/components/RequestTool.tsx
 * @Author: Fofow
 * @Date: 2026/4/1
 * @Description:
 * @Copyright: Copyright (©)}) 2026 Fofow. All rights reserved.
 */
import React, { useState } from 'react';
import { request } from '../apis/requests';

interface ParamItem {
  key: string;
  value: string;
  enabled: boolean;
}
type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS';

const RequestTool: React.FC = () => {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState('');
  const [params, setParams] = useState<ParamItem[]>([
    { key: '', value: '', enabled: true },
  ]);
  const [headers, setHeaders] = useState<ParamItem[]>([
    { key: 'Content-Type', value: 'application/json', enabled: true },
  ]);
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body'>(
    'params',
  );

  // 添加参数行
  const addParam = (type: 'params' | 'headers') => {
    const newItem = { key: '', value: '', enabled: true };
    if (type === 'params') {
      setParams([...params, newItem]);
    } else {
      setHeaders([...headers, newItem]);
    }
  };

  // 更新参数行
  const updateParam = (
    type: 'params' | 'headers',
    index: number,
    field: 'key' | 'value' | 'enabled',
    value: any,
  ) => {
    if (type === 'params') {
      setParams((prevParams) =>
        prevParams.map((item, i) =>
          i === index ? { ...item, [field]: value } : item,
        ),
      );
    } else {
      setHeaders((prevHeaders) =>
        prevHeaders.map((item, i) =>
          i === index ? { ...item, [field]: value } : item,
        ),
      );
    }
  };

  // 删除参数行
  const removeParam = (type: 'params' | 'headers', index: number) => {
    if (type === 'params') {
      setParams(params.filter((_, i) => i !== index));
    } else {
      setHeaders(headers.filter((_, i) => i !== index));
    }
  };

  // 发送请求
  const sendRequest = async () => {
    if (!url.trim()) {
      setError('请输入请求地址');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 构建 query 参数
      const queryParams = params
        .filter((p) => p.key.trim() && p.enabled)
        .reduce((acc, p) => ({ ...acc, [p.key]: p.value }), {});

      // 构建请求头
      const requestHeaders = headers
        .filter((h) => h.key.trim() && h.enabled)
        .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {});

      // 解析 body
      let requestBody = undefined;
      if (
        body.trim() &&
        (method === 'POST' || method === 'PUT' || method === 'PATCH')
      ) {
        try {
          requestBody = JSON.parse(body);
        } catch {
          requestBody = body;
        }
      }

      const config: any = {
        method,
        url,
        params: queryParams,
        headers: requestHeaders,
        data: requestBody,
      };

      const result = await request(config);
      setResponse(result);
    } catch (err: any) {
      setError(err.message || '请求失败');
      setResponse(err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  // 格式化 JSON 显示
  const formatResponse = () => {
    if (!response) return '';
    try {
      return JSON.stringify(response, null, 2);
    } catch {
      return String(response);
    }
  };

return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-red-950 to-neutral-900">
      {/* 请求栏 */}
      <div className="bg-neutral-900/80 backdrop-blur-sm border-b border-red-500/20 p-4">
        <div className="flex gap-2">
          {/* 请求方法 */}
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as HttpMethod)}
            className="px-3 py-2 border border-red-500/30 rounded-lg bg-neutral-800 text-neutral-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="GET" className="text-green-400">GET</option>
            <option value="POST" className="text-yellow-400">POST</option>
            <option value="PUT" className="text-blue-400">PUT</option>
            <option value="DELETE" className="text-red-400">DELETE</option>
            <option value="PATCH" className="text-purple-400">PATCH</option>
          </select>

          {/* URL 输入框 */}
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="请输入请求地址，例如：/users 或 https://api.example.com/users"
            className="flex-1 px-3 py-2 bg-neutral-800 border border-red-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-neutral-200 placeholder-neutral-500 font-mono text-sm"
          />

          {/* 发送按钮 */}
          <button
            onClick={sendRequest}
            disabled={loading}
            className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-red-500/50 disabled:to-red-600/50 text-white rounded-lg font-medium transition-all shadow-lg shadow-red-500/25 disabled:shadow-none"
          >
            {loading ? '发送中...' : '发送请求'}
          </button>
        </div>
      </div>

      {/* 参数配置区域 */}
      <div className="bg-neutral-900/80 backdrop-blur-sm border-b border-red-500/20">
        <div className="flex gap-4 px-4">
          <button
            onClick={() => setActiveTab('params')}
            className={`px-3 py-2 text-sm font-medium transition-all ${
              activeTab === 'params'
                ? 'text-red-400 border-b-2 border-red-500'
                : 'text-neutral-400 hover:text-neutral-300'
            }`}
          >
            Query 参数
          </button>
          <button
            onClick={() => setActiveTab('headers')}
            className={`px-3 py-2 text-sm font-medium transition-all ${
              activeTab === 'headers'
                ? 'text-red-400 border-b-2 border-red-500'
                : 'text-neutral-400 hover:text-neutral-300'
            }`}
          >
            请求头
          </button>
          <button
            onClick={() => setActiveTab('body')}
            className={`px-3 py-2 text-sm font-medium transition-all ${
              activeTab === 'body'
                ? 'text-red-400 border-b-2 border-red-500'
                : 'text-neutral-400 hover:text-neutral-300'
            }`}
          >
            Body
          </button>
        </div>

        {/* 参数内容 */}
        <div className="p-4">
          {activeTab === 'params' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-neutral-400">Query 参数</span>
                <button
                  onClick={() => addParam('params')}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  + 添加参数
                </button>
              </div>
              <div className="space-y-2">
                {params.map((param, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="checkbox"
                      checked={param.enabled}
                      onChange={(e) =>
                        updateParam(
                          'params',
                          index,
                          'enabled',
                          e.target.checked,
                        )
                      }
                      className="w-4 h-4 rounded border-red-500/30 bg-neutral-800 text-red-500 focus:ring-red-500 focus:ring-offset-0"
                    />
                    <input
                      type="text"
                      value={param.key}
                      onChange={(e) =>
                        updateParam('params', index, 'key', e.target.value)
                      }
                      placeholder="参数名"
                      className="flex-1 px-2 py-1.5 bg-neutral-800 border border-red-500/30 rounded text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                    <input
                      type="text"
                      value={param.value}
                      onChange={(e) =>
                        updateParam('params', index, 'value', e.target.value)
                      }
                      placeholder="参数值"
                      className="flex-1 px-2 py-1.5 bg-neutral-800 border border-red-500/30 rounded text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                    <button
                      onClick={() => removeParam('params', index)}
                      className="text-red-400 hover:text-red-300 text-sm transition-colors"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'headers' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-neutral-400">请求头</span>
                <button
                  onClick={() => addParam('headers')}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  + 添加请求头
                </button>
              </div>
              <div className="space-y-2">
                {headers.map((header, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="checkbox"
                      checked={header.enabled}
                      onChange={(e) =>
                        updateParam(
                          'headers',
                          index,
                          'enabled',
                          e.target.checked,
                        )
                      }
                      className="w-4 h-4 rounded border-red-500/30 bg-neutral-800 text-red-500 focus:ring-red-500 focus:ring-offset-0"
                    />
                    <input
                      type="text"
                      value={header.key}
                      onChange={(e) =>
                        updateParam('headers', index, 'key', e.target.value)
                      }
                      placeholder="Header 名称"
                      className="flex-1 px-2 py-1.5 bg-neutral-800 border border-red-500/30 rounded text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                    <input
                      type="text"
                      value={header.value}
                      onChange={(e) =>
                        updateParam('headers', index, 'value', e.target.value)
                      }
                      placeholder="Header 值"
                      className="flex-1 px-2 py-1.5 bg-neutral-800 border border-red-500/30 rounded text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                    <button
                      onClick={() => removeParam('headers', index)}
                      className="text-red-400 hover:text-red-300 text-sm transition-colors"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'body' && (
            <div>
              <span className="text-sm text-neutral-400 mb-2 block">
                请求体 (JSON 格式)
              </span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder='{
  "name": "example",
  "value": 123
}'
                className="w-full h-48 px-3 py-2 bg-neutral-800 border border-red-500/30 rounded-lg font-mono text-sm text-neutral-200 placeholder-neutral-500 resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* 响应区域 */}
      <div className="flex-1 overflow-auto p-4">
        <div className="mb-2 flex justify-between items-center">
          <span className="text-sm font-medium text-neutral-300">响应结果</span>
          {response && (
            <button
              onClick={() => navigator.clipboard.writeText(formatResponse())}
              className="text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              复制
            </button>
          )}
        </div>

        {loading && (
          <div className="bg-neutral-800/50 rounded-lg p-8 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-3 h-3 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              <span className="text-neutral-400 ml-2">请求发送中...</span>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="text-red-400 text-sm font-medium mb-1">
              请求失败
            </div>
            <pre className="text-red-400 text-sm whitespace-pre-wrap">
              {error}
            </pre>
            {response && (
              <pre className="text-red-400 text-sm whitespace-pre-wrap mt-2">
                {formatResponse()}
              </pre>
            )}
          </div>
        )}

        {response && !loading && !error && (
          <div className="bg-neutral-900 rounded-lg p-4 overflow-auto border border-red-500/20">
            <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
              {formatResponse()}
            </pre>
          </div>
        )}

        {!response && !loading && !error && (
          <div className="bg-neutral-800/30 rounded-lg p-8 text-center text-neutral-500 border border-red-500/20">
            <svg className="w-12 h-12 mx-auto mb-3 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
            点击发送按钮查看响应结果
          </div>
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-bounce {
          animation: bounce 0.6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default RequestTool;
