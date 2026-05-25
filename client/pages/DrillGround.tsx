/** src/components/DrillGround.tsx
 * @Author: Fofow
 * @Date: 2026/4/2
 * @Description: 练习场组件 - 集成SQLite数据管理和打印机控制
 * @Copyright: Copyright (©) 2026 Fofow. All rights reserved.
 */

// components/ChatInterface.tsx
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [currentSkill, setCurrentSkill] = useState<string>('default.skill.md');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 加载技能列表
    loadSkills();
    // 添加欢迎消息
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: '你好！我是 AI 助手，可以帮你编写和管理代码。有什么需要帮助的吗？',
        timestamp: new Date(),
      },
    ]);
  }, []);

  const loadSkills = async () => {
    try {
      const skillList = await agentApi.getSkills();
      setSkills(skillList);
    } catch (error) {
      console.error('Failed to load skills:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    <div className="chat-container">
      <div className="chat-header">
        <h2>AI Agent 助手</h2>
        <div className="controls">
          <select 
            value={currentSkill} 
            onChange={(e) => handleSkillChange(e.target.value)}
            className="skill-selector"
          >
            {skills.map(skill => (
              <option key={skill} value={skill}>{skill}</option>
            ))}
          </select>
          <button onClick={handleReset} className="reset-btn">
            重置会话
          </button>
        </div>
      </div>

      <div className="messages-container">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-header">
              <strong>{message.role === 'user' ? '你' : 'AI助手'}</strong>
              <span className="timestamp">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
            <div className="message-content">
              {message.content.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            {message.fileOperations && message.fileOperations.length > 0 && (
              <div className="file-operations">
                <strong>文件操作：</strong>
                <ul>
                  {message.fileOperations.map((op, i) => (
                    <li key={i}>
                      {op.action}: {op.path} 
                      {op.success ? '✓' : '✗'} 
                      {op.result && <span className="result"> - {op.result}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="message assistant loading">
            <div className="loading-indicator">AI 正在思考...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
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
          className="message-input"
        />
        <button 
          onClick={handleSendMessage} 
          disabled={loading || !input.trim()}
          className="send-btn"
        >
          发送
        </button>
      </div>
    </div>
  );
};

export default DrillGround;