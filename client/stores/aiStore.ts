// /stores/aiStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface AIState {
  // 消息相关
  messages: Message[];
  isLoading: boolean;

  // API 相关
  apiKey: string;
  useStreaming: boolean;

  // 聊天习惯（系统提示词）
  systemPrompt: string;
  systemPromptEnabled: boolean;

  // Actions
  addMessage: (message: Message) => void;
  updateLastMessage: (content: string) => void;
  setMessages: (messages: Message[]) => void;
  setIsLoading: (loading: boolean) => void;
  clearChat: () => void;

  setApiKey: (key: string) => void;
  setUseStreaming: (streaming: boolean) => void;

  setSystemPrompt: (prompt: string) => void;
  setSystemPromptEnabled: (enabled: boolean) => void;

  // 获取发送用的消息列表（包含系统提示）
  getMessagesWithSystemPrompt: () => Array<{ role: string; content: string }>;
}

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      // 初始状态
      messages: [
        {
          id: '1',
          content: '你好！我是DeepSeek助手，有什么可以帮您的？',
          role: 'assistant',
          timestamp: new Date(),
        },
      ],
      isLoading: false,
      apiKey: '',
      useStreaming: false,
      systemPrompt: '你是一个专业的AI助手，请用友好、专业的语气回答问题。',
      systemPromptEnabled: true,

      // Actions
      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),

      updateLastMessage: (content) =>
        set((state) => {
          const messages = [...state.messages];
          if (messages.length === 0) return state;

          const lastIndex = messages.length - 1;
          const lastMessage = messages[lastIndex];

          if (lastMessage && lastMessage.role === 'assistant') {
            messages[lastIndex] = { ...lastMessage, content };
            return { messages };
          }
          return state;
        }),

      setMessages: (messages) => set({ messages }),

      setIsLoading: (loading) => set({ isLoading: loading }),

      clearChat: () =>
        set({
          messages: [
            {
              id: Date.now().toString(),
              content: '你好！我是DeepSeek助手，有什么可以帮您的？',
              role: 'assistant',
              timestamp: new Date(),
            },
          ],
        }),

      setApiKey: (key) => set({ apiKey: key }),

      setUseStreaming: (streaming) => set({ useStreaming: streaming }),

      setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),

      setSystemPromptEnabled: (enabled) =>
        set({ systemPromptEnabled: enabled }),

      getMessagesWithSystemPrompt: () => {
        const { messages, systemPrompt, systemPromptEnabled } = get();
        const conversationMessages = messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        if (systemPromptEnabled && systemPrompt.trim()) {
          return [
            { role: 'system', content: systemPrompt },
            ...conversationMessages,
          ];
        }

        return conversationMessages;
      },
    }),
    {
      name: 'ai-chat-storage',
      partialize: (state) => ({
        apiKey: state.apiKey,
        useStreaming: state.useStreaming,
        systemPrompt: state.systemPrompt,
        systemPromptEnabled: state.systemPromptEnabled,
      }),
    },
  ),
);
