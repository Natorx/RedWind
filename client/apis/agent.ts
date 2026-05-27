// services/agentApi.ts

import { ChatRequest, ChatResponse } from "../interface/agent";

class AgentApiService {
  private baseUrl: string;
  private sessionId: string | null = null;

  constructor(baseUrl: string = import.meta.env.VITE_AGENT_URL) {
    this.baseUrl = baseUrl;
    // 从 localStorage 恢复会话
    const savedSessionId = localStorage.getItem('agent_session_id');
    if (savedSessionId) {
      this.sessionId = savedSessionId;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'API request failed');
    }

    return response.json();
  }

  async sendMessage(
    message: string,
    autoExecute: boolean = true,
  ): Promise<ChatResponse> {
    const request: ChatRequest = {
      message,
      session_id: this.sessionId || undefined,
      auto_execute: autoExecute,
    };

    const response = await this.request<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    // 保存 session_id
    if (response.session_id) {
      this.sessionId = response.session_id;
      localStorage.setItem('agent_session_id', response.session_id);
    }

    return response;
  }

  async resetConversation(): Promise<void> {
    if (!this.sessionId) return;

    await this.request('/reset', {
      method: 'POST',
      body: JSON.stringify({ session_id: this.sessionId }),
    });

    // 清空本地存储的 session
    this.sessionId = null;
    localStorage.removeItem('agent_session_id');
  }

  async getSkills(): Promise<string[]> {
    const response = await this.request<{ skills: string[] }>('/skills');
    return response.skills;
  }

  async switchSkill(skillName: string, enabled: boolean = true): Promise<void> {
    if (!this.sessionId) throw new Error('No active session');

    await this.request('/skill/switch', {
      method: 'POST',
      body: JSON.stringify({
        session_id: this.sessionId,
        skill_name: skillName,
        enabled,
      }),
    });
  }

  async clearHistory(): Promise<void> {
    if (!this.sessionId) return;

    await this.request('/history', {
      method: 'DELETE',
      body: JSON.stringify({ session_id: this.sessionId }),
    });
  }

  getSessionId(): string | null {
    return this.sessionId;
  }
}

export const agentApi = new AgentApiService(import.meta.env.VITE_AGENT_URL);
