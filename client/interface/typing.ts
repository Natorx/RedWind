// typing.interface.ts
// 打字练习模块的数据结构：段落

/** 一条练习段落（段落本身足够长，相当于小作文） */
export interface Passage {
  id: number;
  /** 段落标题（可为空） */
  title: string;
  /** 段落正文，打字练习的目标文本 */
  content: string;
  /** 是否为内置段落 */
  is_official: boolean;
  order_index: number;
  created_at: string;
}

/** 划词翻译结果 */
export interface TranslationResult {
  source: string;
  target: string;
  to_lang: string;
}

/** 保留以兼容旧代码，但不再使用 */
export interface RawWordSet {
  id: number;
  name: string;
  words: string;
  is_official: boolean;
  created_at: string;
}
