// src/components/AIChat.tsx
import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: '你好！我是DeepSeek助手，有什么可以帮您的？',
      role: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [useStreaming, setUseStreaming] = useState(false); // 新增：流式输出开关
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 从 localStorage 加载 API Key 和流式设置
  useEffect(() => {
    const savedKey = localStorage.getItem('deepseek_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
    
    const savedStreaming = localStorage.getItem('use_streaming');
    if (savedStreaming) {
      setUseStreaming(savedStreaming === 'true');
    }
  }, []);

  // 保存 API Key
  const saveApiKey = () => {
    localStorage.setItem('deepseek_api_key', apiKey);
    alert('API Key 已保存');
  };

  // 保存流式设置
  const saveStreamingSetting = () => {
    localStorage.setItem('use_streaming', useStreaming.toString());
  };

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 普通发送消息（非流式）
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    if (!apiKey) {
      alert('请先设置您的 DeepSeek API Key');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            ...messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            {
              role: 'user',
              content: input
            }
          ],
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }

      const data = await response.json();
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.choices[0].message.content,
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('发送消息失败:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `抱歉，请求失败: ${error instanceof Error ? error.message : '未知错误'}`,
        role: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 流式发送消息
  const sendMessageStreaming = async () => {
    if (!input.trim() || isLoading) return;

    if (!apiKey) {
      alert('请先设置您的 DeepSeek API Key');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // 先创建一个空的AI消息用于流式更新
    const aiMessageId = (Date.now() + 1).toString();
    const initialAiMessage: Message = {
      id: aiMessageId,
      content: '',
      role: 'assistant',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, initialAiMessage]);

    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            ...messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            {
              role: 'user',
              content: input
            }
          ],
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullContent = '';

      if (!reader) {
        throw new Error('无法读取响应流');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              
              if (content) {
                fullContent += content;
                
                // 更新最后一条消息的内容（流式效果）
                setMessages(prev => {
                  const lastMessage = prev[prev.length - 1];
                  if (lastMessage.id === aiMessageId) {
                    return [
                      ...prev.slice(0, -1),
                      {
                        ...lastMessage,
                        content: fullContent
                      }
                    ];
                  }
                  return prev;
                });
              }
            } catch (e) {
              console.warn('解析流数据失败:', e);
            }
          }
        }
      }

      // 流式传输完成后，确保消息内容完整
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage.id === aiMessageId) {
          return [
            ...prev.slice(0, -1),
            {
              ...lastMessage,
              content: fullContent || '（无响应内容）'
            }
          ];
        }
        return prev;
      });

    } catch (error) {
      console.error('流式发送消息失败:', error);
      
      // 更新错误消息
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage.id === aiMessageId) {
          return [
            ...prev.slice(0, -1),
            {
              ...lastMessage,
              content: `抱歉，流式请求失败: ${error instanceof Error ? error.message : '未知错误'}`
            }
          ];
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 根据设置选择发送方式
  const handleSendMessage = () => {
    if (useStreaming) {
      sendMessageStreaming();
    } else {
      sendMessage();
    }
  };

  // 清空对话
  const clearChat = () => {
    if (window.confirm('确定要清空对话吗？')) {
      setMessages([
        {
          id: '1',
          content: '你好！我是DeepSeek助手，有什么可以帮您的？',
          role: 'assistant',
          timestamp: new Date()
        }
      ]);
    }
  };

  // 处理回车键
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 切换流式输出
  const toggleStreaming = () => {
    const newValue = !useStreaming;
    setUseStreaming(newValue);
    localStorage.setItem('use_streaming', newValue.toString());
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-800">DeepSeek AI 助手</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleStreaming}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              useStreaming 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={useStreaming ? '点击关闭流式输出' : '点击开启流式输出'}
          >
            {useStreaming ? '流式输出: 开' : '流式输出: 关'}
          </button>
          <button
            onClick={clearChat}
            className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            清空对话
          </button>
        </div>
      </div>

      {/* API Key 设置 */}
      <div className="p-4 bg-blue-50 border-b border-blue-100">
        <div className="flex items-center space-x-2 mb-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="请输入 DeepSeek API Key"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={saveApiKey}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            保存
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="streaming-toggle"
              checked={useStreaming}
              onChange={toggleStreaming}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="streaming-toggle" className="text-sm text-gray-700">
              启用流式输出（打字机效果）
            </label>
          </div>
          
          <button
            onClick={saveStreamingSetting}
            className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            保存设置
          </button>
        </div>
        
        <p className="mt-2 text-sm text-gray-600">
          API Key 仅保存在本地浏览器中，不会发送到任何其他服务器
        </p>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-800'
              }`}
            >
              <div className="whitespace-pre-wrap">
                {message.content}
                {message.role === 'assistant' && message.content === '' && (
                  <span className="text-gray-400">正在输入...</span>
                )}
              </div>
              <div className={`text-xs mt-1 ${message.role === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {message.role === 'assistant' && useStreaming && (
                  <span className="ml-2 text-green-500">• 流式</span>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && !useStreaming && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入您的问题..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            disabled={isLoading}
          />
          <div className="flex flex-col space-y-2">
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '发送中...' : '发送'}
            </button>
            <div className="text-xs text-center text-gray-500">
              {useStreaming ? '流式模式' : '普通模式'}
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center mt-2">
          <p className="text-sm text-gray-500">
            按 Enter 发送，Shift + Enter 换行
          </p>
          <p className="text-sm text-gray-500">
            当前模式: <span className={useStreaming ? 'text-green-600 font-medium' : 'text-blue-600 font-medium'}>
              {useStreaming ? '流式输出' : '普通输出'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
