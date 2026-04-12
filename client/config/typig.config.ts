// typing.config.ts
import { WordSet } from "../interface/typing.interface";

// 官方词汇集 1 - 基础词汇
export const OFFICIAL_WORD_SET_1: WordSet = {
  id: -2,
  name: "基础词汇 (50词)",
  words: [
    'apple', 'beautiful', 'computer', 'developer', 'experience',
    'fantastic', 'github', 'hello', 'internet', 'javascript',
    'knowledge', 'learning', 'mountain', 'network', 'open source',
    'programming', 'quality', 'react', 'software', 'technology',
    'unique', 'virtual', 'website', 'xenial', 'youtube',
    'zealous', 'algorithm', 'backend', 'cloud', 'database',
    'frontend', 'git', 'html', 'css', 'typescript',
    'python', 'java', 'rust', 'go', 'swift',
    'kotlin', 'ruby', 'php', 'docker', 'kubernetes',
    'aws', 'azure', 'mongodb', 'postgresql', 'redis'
  ],
  isOfficial: true,
  createdAt: new Date().toISOString()
};

// 官方词汇集 2 - 编程术语
export const OFFICIAL_WORD_SET_2: WordSet = {
  id: -1,
  name: "编程术语 (40词)",
  words: [
    'asynchronous', 'callback', 'closure', 'compiler', 'dependency',
    'encapsulation', 'framework', 'functional', 'generics', 'immutable',
    'inheritance', 'interface', 'lambda', 'middleware', 'namespace',
    'optimization', 'polymorphism', 'queue', 'recursion', 'singleton',
    'thread', 'variable', 'webpack', 'xml', 'yaml',
    'zero', 'boolean', 'constant', 'debugger', 'event loop',
    'factory', 'garbage', 'hoisting', 'iterator', 'json',
    'keyword', 'lexical', 'memoization', 'nullable', 'object'
  ],
  isOfficial: true,
  createdAt: new Date().toISOString()
};