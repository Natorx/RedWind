import React, { useState } from 'react';
import request from '../utils/requests';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface ParamItem {
  key: string;
  value: string;
  enabled: boolean;
}

const RequestTool: React.FC = () => {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState('');
  const [params, setParams] = useState<ParamItem[]>([{ key: '', value: '', enabled: true }]);
  const [headers, setHeaders] = useState<ParamItem[]>([{ key: 'Content-Type', value: 'application/json', enabled: true }]);
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body'>('params');

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
    value: any
  ) => {
    if (type === 'params') {
      const newParams = [...params];
      newParams[index][field] = value;
      setParams(newParams);
    } else {
      const newHeaders = [...headers];
      newHeaders[index][field] = value;
      setHeaders(newHeaders);
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
        .filter(p => p.key.trim() && p.enabled)
        .reduce((acc, p) => ({ ...acc, [p.key]: p.value }), {});

      // 构建请求头
      const requestHeaders = headers
        .filter(h => h.key.trim() && h.enabled)
        .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {});

      // 解析 body
      let requestBody = undefined;
      if (body.trim() && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
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
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 请求栏 */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex gap-2">
          {/* 请求方法 */}
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as HttpMethod)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
          </select>

          {/* URL 输入框 */}
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="请输入请求地址，例如：/users 或 https://api.example.com/users"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />

          {/* 发送按钮 */}
          <button
            onClick={sendRequest}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? '发送中...' : '发送请求'}
          </button>
        </div>
      </div>

      {/* 参数配置区域 */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex gap-4 px-4">
          <button
            onClick={() => setActiveTab('params')}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'params'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Query 参数
          </button>
          <button
            onClick={() => setActiveTab('headers')}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'headers'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            请求头
          </button>
          <button
            onClick={() => setActiveTab('body')}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'body'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
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
                <span className="text-sm text-gray-600">Query 参数</span>
                <button
                  onClick={() => addParam('params')}
                  className="text-sm text-blue-600 hover:text-blue-700"
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
                      onChange={(e) => updateParam('params', index, 'enabled', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <input
                      type="text"
                      value={param.key}
                      onChange={(e) => updateParam('params', index, 'key', e.target.value)}
                      placeholder="参数名"
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                    <input
                      type="text"
                      value={param.value}
                      onChange={(e) => updateParam('params', index, 'value', e.target.value)}
                      placeholder="参数值"
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                    <button
                      onClick={() => removeParam('params', index)}
                      className="text-red-500 hover:text-red-700 text-sm"
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
                <span className="text-sm text-gray-600">请求头</span>
                <button
                  onClick={() => addParam('headers')}
                  className="text-sm text-blue-600 hover:text-blue-700"
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
                      onChange={(e) => updateParam('headers', index, 'enabled', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <input
                      type="text"
                      value={header.key}
                      onChange={(e) => updateParam('headers', index, 'key', e.target.value)}
                      placeholder="Header 名称"
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                    <input
                      type="text"
                      value={header.value}
                      onChange={(e) => updateParam('headers', index, 'value', e.target.value)}
                      placeholder="Header 值"
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                    <button
                      onClick={() => removeParam('headers', index)}
                      className="text-red-500 hover:text-red-700 text-sm"
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
              <span className="text-sm text-gray-600 mb-2 block">请求体 (JSON 格式)</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder='{
  "name": "example",
  "value": 123
}'
                className="w-full h-48 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* 响应区域 */}
      <div className="flex-1 overflow-auto p-4">
        <div className="mb-2 flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">响应结果</span>
          {response && (
            <button
              onClick={() => navigator.clipboard.writeText(formatResponse())}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              复制
            </button>
          )}
        </div>

        {loading && (
          <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-500">
            请求发送中...
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-600 text-sm font-medium mb-1">请求失败</div>
            <pre className="text-red-600 text-sm whitespace-pre-wrap">{error}</pre>
            {response && (
              <pre className="text-red-600 text-sm whitespace-pre-wrap mt-2">{formatResponse()}</pre>
            )}
          </div>
        )}

        {response && !loading && !error && (
          <div className="bg-gray-900 rounded-lg p-4 overflow-auto">
            <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
              {formatResponse()}
            </pre>
          </div>
        )}

        {!response && !loading && !error && (
          <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-400">
            点击发送按钮查看响应结果
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestTool;