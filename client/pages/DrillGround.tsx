// src/components/DrillGround.tsx
import React, { useState, useEffect, useRef } from 'react';
import { agentApi, FileOperation } from '../apis/agent';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  fileOperations?: FileOperation[];
}

const DrillGround: React.FC = () => {
  // 直接初始化欢迎消息，不再使用 useEffect 设置
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '你好！我是 AI 助手，可以帮你编写和管理代码。有什么需要帮助的吗？',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [currentSkill, setCurrentSkill] = useState<string>('default.skill.md');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      const skillList = await agentApi.getSkills();
      setSkills(skillList);
    } catch (error) {
      console.error('Failed to load skills:', error);
    }
  };

  // 使用 useLayoutEffect 同步滚动，避免视觉抖动
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await agentApi.sendMessage(input);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        fileOperations: response.file_operations,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，发送消息时出现错误。请检查后端服务是否正常运行。',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      await agentApi.resetConversation();
      setMessages([
        {
          id: 'reset',
          role: 'assistant',
          content: '会话已重置。有什么我可以帮助你的吗？',
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error('Failed to reset conversation:', error);
    }
  };

  const handleSkillChange = async (skillName: string) => {
    try {
      await agentApi.switchSkill(skillName, true);
      setCurrentSkill(skillName);
      
      const systemMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `已切换到技能: ${skillName}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, systemMessage]);
    } catch (error) {
      console.error('Failed to switch skill:', error);
    }
  };

  return (
    /* 关键：使用 h-screen 固定容器高度，flex-col 分配空间 */
    <div className="flex flex-col h-screen bg-gradient-to-br from-red-950 to-neutral-900 relative overflow-hidden">
      {/* 边缘扫描特效（保持不变） */}
      <div className="absolute inset-0 pointer-events-none z-20">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-scan-top"></div>
        <div className="absolute top-0 right-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-red-500 to-transparent animate-scan-right"></div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-scan-bottom"></div>
        <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-red-500 to-transparent animate-scan-left"></div>
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-red-500/80 rounded-tl-lg animate-pulse-glow"></div>
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-red-500/80 rounded-tr-lg animate-pulse-glow"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-red-500/80 rounded-bl-lg animate-pulse-glow"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-red-500/80 rounded-br-lg animate-pulse-glow"></div>
      </div>

      {/* 主内容区域，z-30 */}
      <div className="relative z-30 flex flex-col flex-1 mx-auto w-4xl p-4 gap-4 h-full ">
        {/* 头部（高度由内容决定，不变） */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-800/60 backdrop-blur-sm border border-neutral-700/50 shrink-0">
          <h2 className="text-lg font-bold text-red-400">AI Agent 助手</h2>
          <div className="flex items-center gap-3">
            <select 
              value={currentSkill} 
              onChange={(e) => handleSkillChange(e.target.value)}
              className="bg-neutral-700/80 text-neutral-200 px-3 py-1.5 rounded-lg outline-none focus:ring-2 focus:ring-red-500/50 border border-neutral-600"
            >
              {skills.map(skill => (
                <option key={skill} value={skill}>{skill}</option>
              ))}
            </select>
            <button 
              onClick={handleReset} 
              className="px-4 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white transition-colors text-sm"
            >
              重置会话
            </button>
          </div>
        </div>

        {/* 消息列表：flex-1 填满剩余空间，min-h-0 防止溢出，overflow-y-auto 滚动 */}
        <div
          ref={messagesContainerRef}
          className="flex-1 min-h-0 overflow-y-auto scroll-none space-y-3 px-1"
        >
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user' 
                  ? 'bg-red-600/70 text-white' 
                  : 'bg-neutral-800/70 text-neutral-200 border border-neutral-700/40'
              }`}>
                <div className="flex items-center gap-2 mb-1 text-xs text-neutral-400">
                  <strong>{message.role === 'user' ? '你' : 'AI助手'}</strong>
                  <span>{message.timestamp.toLocaleTimeString()}</span>
                </div>
                <div className="text-sm leading-relaxed">
                  {message.content.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
                {message.fileOperations && message.fileOperations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-neutral-600 text-xs">
                    <span className="text-red-400 font-medium">文件操作：</span>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      {message.fileOperations.map((op, i) => (
                        <li key={i} className={op.success ? 'text-green-400' : 'text-red-400'}>
                          {op.action}: {op.path} {op.success ? '✓' : '✗'}
                          {op.result && <span className="text-neutral-400"> - {op.result}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg p-3 bg-neutral-800/70 text-neutral-200 border border-neutral-700/40">
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  AI 正在思考...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区：shrink-0 固定高度 */}
        <div className="flex items-end gap-2 p-3 rounded-lg bg-neutral-800/60 backdrop-blur-sm border border-neutral-700/50 shrink-0">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="输入你的问题... (Shift+Enter 换行，Enter 发送)"
            disabled={loading}
            className="flex-1 bg-neutral-700/50 text-neutral-200 placeholder-neutral-500 resize-none outline-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500/30 border border-neutral-600"
            rows={2}
          />
          <button 
            onClick={handleSendMessage} 
            disabled={loading || !input.trim()}
            className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors text-sm"
          >
            发送
          </button>
        </div>
      </div>

      {/* CSS 动画 */}
      <style>{`
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
          0%, 100% { opacity: 0.3; box-shadow: 0 0 0px rgba(239, 68, 68, 0); }
          50% { opacity: 1; box-shadow: 0 0 20px rgba(239, 68, 68, 0.8); }
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

export default DrillGround;
