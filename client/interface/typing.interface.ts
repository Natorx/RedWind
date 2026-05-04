// typing.interface.ts
export interface WordSet {
  id: number;
  name: string;
  isOfficial: boolean;
  createdAt: string;
  words?: string[];  // 单词列表（兼容旧代码）
  items?: WordItem[]; // 完整的单词项（包含释义）
}

export interface WordItem {
  id: number;
  word_set_id: number;
  word: string;
  meaning: string;
  order_index: number;
}

export interface TypingStats {
  wpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  totalChars: number;
  startTime: number | null;
  endTime: number | null;
}

export interface HistoryItem {
  word: string;
  correct: boolean;
  time: number;
}

// 保留以兼容旧代码，但不再使用
export interface RawWordSet {
  id: number;
  name: string;
  words: string;
  is_official: boolean;
  created_at: string;
}