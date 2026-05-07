/**src/components/AIChat.tsx
 * @Author: Fofow
 * @Date: 2026/4/1
 * @Description: 
 * @Copyright: Copyright (©)}) 2026 Fofow. All rights reserved.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Message, useAIStore } from '../stores/aiStore';
import { Settings, X, Save, Eye, EyeOff } from 'lucide-react';

const AIChat: React.FC = () => {
  const {
    messages,
    isLoading,
    apiKey,
    useStreaming,
    systemPrompt,
    systemPromptEnabled,
    addMessage,
    updateLastMessage,
    setIsLoading,
    clearChat,
    setApiKey,
    setUseStreaming,
    setSystemPrompt,
    setSystemPromptEnabled
  } = useAIStore();

  const [input, setInput] = useState('');
  const [showSystemPromptModal, setShowSystemPromptModal] = useState(false);
  const [tempSystemPrompt, setTempSystemPrompt] = useState(systemPrompt);
  const [showPreview, setShowPreview] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 保存系统提示词
  const handleSaveSystemPrompt = () => {
    setSystemPrompt(tempSystemPrompt);
    setShowSystemPromptModal(false);
  };

// 普通发送消息（非流式）- 修复版
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

  addMessage(userMessage);
  setInput('');
  setIsLoading(true);

  // 调整文本框高度
  if (textareaRef.current) {
    textareaRef.current.style.height = 'auto';
  }

  try {
    const messagesWithSystem = useAIStore.getState().getMessagesWithSystemPrompt();
    
    console.log('发送消息:', messagesWithSystem); // 调试日志
    
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messagesWithSystem,
        stream: false
      })
    });

    console.log('响应状态:', response.status); // 调试日志

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API错误响应:', errorText);
      throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('API响应数据:', data); // 调试日志
    
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: data.choices[0].message.content,
      role: 'assistant',
      timestamp: new Date()
    };

    addMessage(aiMessage);
  } catch (error) {
    console.error('发送消息失败:', error);
    
    const errorMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: `抱歉，请求失败: ${error instanceof Error ? error.message : '未知错误'}`,
      role: 'assistant',
      timestamp: new Date()
    };
    
    addMessage(errorMessage);
  } finally {
    setIsLoading(false);
  }
};

// 流式发送消息 - 修复版
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

  addMessage(userMessage);
  setInput('');
  setIsLoading(true);

  // 调整文本框高度
  if (textareaRef.current) {
    textareaRef.current.style.height = 'auto';
  }

  // 先创建一个空的AI消息用于流式更新
  const aiMessageId = (Date.now() + 1).toString();
  const emptyAiMessage: Message = {
    id: aiMessageId,
    content: '',
    role: 'assistant',
    timestamp: new Date()
  };
  
  // 添加空消息到消息列表
  addMessage(emptyAiMessage);

  try {
    const messagesWithSystem = useAIStore.getState().getMessagesWithSystemPrompt();
    
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messagesWithSystem,
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
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
              // 使用 updateLastMessage 更新最后一条消息
              updateLastMessage(fullContent);
            }
          } catch (e) {
            console.warn('解析流数据失败:', e, line);
          }
        }
      }
    }

    // 确保最终内容完整
    if (fullContent === '') {
      updateLastMessage('（无响应内容）');
    }

  } catch (error) {
    console.error('流式发送消息失败:', error);
    updateLastMessage(`抱歉，流式请求失败: ${error instanceof Error ? error.message : '未知错误'}`);
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

  // 处理回车键
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 切换流式输出
  const toggleStreaming = () => {
    setUseStreaming(!useStreaming);
  };

  // 自动调整文本框高度
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-red-950 to-neutral-900">
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-4 bg-neutral-900/80 backdrop-blur-sm border-b border-red-500/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">AI</span>
          </div>
          <h1 className="text-xl font-semibold bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
            DeepSeek AI 助手
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSystemPromptModal(true)}
            className="px-3 py-1 text-sm text-neutral-300 bg-neutral-700 rounded-md hover:bg-neutral-600 transition-all border border-red-500/30 flex items-center gap-1"
            title="设置聊天习惯"
          >
            <Settings className="w-3 h-3" />
            习惯设置
          </button>
          <button
            onClick={toggleStreaming}
            className={`px-3 py-1 text-sm rounded-md transition-all ${
              useStreaming 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30' 
                : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600 border border-red-500/30'
            }`}
            title={useStreaming ? '点击关闭流式输出' : '点击开启流式输出'}
          >
            {useStreaming ? '流式输出: 开' : '流式输出: 关'}
          </button>
          <button
            onClick={clearChat}
            className="px-3 py-1 text-sm text-neutral-300 bg-neutral-700 rounded-md hover:bg-neutral-600 transition-all border border-red-500/30"
          >
            清空对话
          </button>
        </div>
      </div>

      {/* API Key 设置 */}
      <div className="p-4 bg-red-500/5 border-b border-red-500/20">
        <div className="flex items-center space-x-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="请输入 DeepSeek API Key"
            className="flex-1 px-3 py-2 bg-neutral-800 border border-red-500/30 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-neutral-200 placeholder-neutral-500"
          />
          <button
            onClick={() => localStorage.setItem('deepseek_api_key', apiKey)}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-md hover:from-red-700 hover:to-red-800 transition-all shadow-lg shadow-red-500/25"
          >
            保存
          </button>
        </div>
        {systemPromptEnabled && systemPrompt && (
          <div className="mt-2 text-xs text-neutral-500 flex items-center gap-2">
            <span>💡 正在使用自定义习惯设置</span>
            <button
              onClick={() => setShowSystemPromptModal(true)}
              className="text-red-400 hover:text-red-300"
            >
              查看/编辑
            </button>
          </div>
        )}
      </div>

      {/* 消息区域 - 使用 overflow-y-auto 自动滚动 */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/25'
                  : 'bg-neutral-800/80 border border-red-500/20 text-neutral-200 backdrop-blur-sm'
              }`}
            >
              <div className="whitespace-pre-wrap">
                {message.content}
                {message.role === 'assistant' && message.content === '' && isLoading && (
                  <span className="text-neutral-500">正在输入...</span>
                )}
              </div>
              <div className={`text-xs mt-1 ${message.role === 'user' ? 'text-red-300' : 'text-neutral-500'}`}>
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {message.role === 'assistant' && useStreaming && (
                  <span className="ml-2 text-green-400">• 流式</span>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && !useStreaming && (
          <div className="flex justify-start">
            <div className="bg-neutral-800/80 border border-red-500/20 rounded-lg p-3 backdrop-blur-sm">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 - 固定底部 */}
      <div className="p-4 bg-neutral-900/80 backdrop-blur-sm border-t border-red-500/20">
        <div className="flex space-x-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder="输入您的问题..."
            className="flex-1 px-3 py-2 bg-neutral-800 border border-red-500/30 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-neutral-200 placeholder-neutral-500 resize-none overflow-y-auto"
            rows={1}
            disabled={isLoading}
            style={{ minHeight: '44px', maxHeight: '200px' }}
          />
          <div className="flex flex-col space-y-2">
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-md hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/25"
            >
              {isLoading ? '发送中...' : '发送'}
            </button>
            <div className="text-xs text-center text-neutral-500">
              {useStreaming ? '流式模式' : '普通模式'}
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center mt-2">
          <p className="text-sm text-neutral-500">
            按 Enter 发送，Shift + Enter 换行
          </p>
          <p className="text-sm text-neutral-500">
            当前模式: <span className={useStreaming ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
              {useStreaming ? '流式输出' : '普通输出'}
            </span>
          </p>
        </div>
      </div>

      {/* 系统提示词设置模态框 */}
      {showSystemPromptModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-2xl max-w-2xl w-full border border-red-500/20 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-red-500/20">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-red-400" />
                <h2 className="text-xl font-bold bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
                  聊天习惯设置
                </h2>
              </div>
              <button
                onClick={() => setShowSystemPromptModal(false)}
                className="text-neutral-400 hover:text-red-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* 开关 */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-neutral-200 font-medium block mb-1">
                    启用自定义习惯
                  </label>
                  <p className="text-xs text-neutral-500">
                    开启后，每次对话都会携带您设置的系统提示词
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSystemPromptEnabled(!systemPromptEnabled);
                    setTempSystemPrompt(!systemPromptEnabled ? tempSystemPrompt : systemPrompt);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    systemPromptEnabled ? 'bg-red-600' : 'bg-neutral-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      systemPromptEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* 提示词编辑 */}
              {systemPromptEnabled && (
                <>
                  <div>
                    <label className="text-neutral-200 font-medium block mb-2">
                      系统提示词
                    </label>
                    <textarea
                      value={tempSystemPrompt}
                      onChange={(e) => setTempSystemPrompt(e.target.value)}
                      placeholder="例如：你是一个专业的AI助手，请用友好、专业的语气回答问题。"
                      className="w-full h-32 px-3 py-2 bg-neutral-800 border border-red-500/30 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-neutral-200 placeholder-neutral-500 resize-none"
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      这段提示词会在每次对话前发送给 AI，用于设定 AI 的角色和行为
                    </p>
                  </div>

                                  {/* 预览按钮 */}
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showPreview ? '隐藏预览' : '预览效果'}
                  </button>

                  {/* 预览区域 */}
                  {showPreview && (
                    <div className="bg-neutral-800/50 rounded-lg p-3 border border-red-500/20">
                      <p className="text-xs text-neutral-400 mb-2">预览：</p>
                      <div className="bg-neutral-800 rounded p-2">
                        <div className="text-xs text-red-400 mb-1">System:</div>
                        <p className="text-sm text-neutral-300 whitespace-pre-wrap">
                          {tempSystemPrompt || '（未设置提示词）'}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-red-500/20">
              <button
                onClick={handleSaveSystemPrompt}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-lg shadow-red-500/25 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                保存设置
              </button>
              <button
                onClick={() => setShowSystemPromptModal(false)}
                className="flex-1 px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-all border border-red-500/30"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* 自定义滚动条 */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #3f3f46;
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #ef4444;
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #dc2626;
        }
        
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

export default AIChat;