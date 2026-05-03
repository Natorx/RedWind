// TypingPractice.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  HistoryItem,
  RawWordSet,
  TypingStats,
  WordSet,
} from '../interface/typing.interface';
import {
  OFFICIAL_WORD_SET_1,
  OFFICIAL_WORD_SET_2,
} from '../config/typig.config';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

const TypingPractice: React.FC = () => {
  // 状态管理
  const [wordSets, setWordSets] = useState<WordSet[]>([
    OFFICIAL_WORD_SET_1,
    OFFICIAL_WORD_SET_2,
  ]);
  const [currentSetId, setCurrentSetId] = useState<number>(-2);
  const [currentWord, setCurrentWord] = useState<string>('');
  const [currentMeaning, setCurrentMeaning] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [completedWords, setCompletedWords] = useState<string[]>([]);
  const [remainingWords, setRemainingWords] = useState<string[]>([]);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [meaningsMap, setMeaningsMap] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<TypingStats>({
    wpm: 0,
    accuracy: 100,
    correctChars: 0,
    incorrectChars: 0,
    totalChars: 0,
    startTime: null,
    endTime: null,
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [newSetName, setNewSetName] = useState<string>('');
  const [wordMeaningPairs, setWordMeaningPairs] = useState<
    Array<{ word: string; meaning: string }>
  >([{ word: '', meaning: '' }]);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number | null>(null);

  // 获取当前词汇集
  const currentWordSet = wordSets.find((set) => set.id === currentSetId);

  // 显示消息
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // 加载所有释义
  const loadAllMeanings = async () => {
    try {
      console.log('Loading meanings from database...');
      const meaningsJson = await invoke<string>('get_all_meanings');
      console.log('Raw JSON from backend:', meaningsJson);

      const meanings = JSON.parse(meaningsJson);
      console.log('Parsed meanings:', meanings);
      console.log('Number of meanings:', Object.keys(meanings).length);

      setMeaningsMap(meanings);

      // 测试获取某个单词的释义
      if (meanings['apple']) {
        console.log('Test apple meaning:', meanings['apple']);
      }
    } catch (error) {
      console.error('加载释义失败:', error);
      showMessage('error', '加载释义失败: ' + error);
    }
  };

  // 获取单词释义（从数据库加载）
  const getWordMeaningFromDb = (word: string): string => {
    const lowerWord = word.toLowerCase();
    const meaning = meaningsMap[lowerWord];
    console.log(`Getting meaning for "${word}":`, meaning);
    return meaning || '暂无释义';
  };

  // 加载自定义词汇集（从数据库）
  const loadCustomWordSets = async () => {
    try {
      setIsLoading(true);
      const customSets = await invoke<RawWordSet[]>('get_custom_word_sets');
      if (customSets && Array.isArray(customSets) && customSets.length > 0) {
        // 将后端的 words 字符串解析为数组
        const parsedSets: WordSet[] = customSets
          .filter(
            (set): set is RawWordSet =>
              set != null && typeof set.id === 'number',
          )
          .map((set) => {
            try {
              const parsedWords = JSON.parse(set.words);
              return {
                id: set.id,
                name: set.name,
                words: Array.isArray(parsedWords) ? parsedWords : [],
                isOfficial: false,
                createdAt: set.created_at || new Date().toISOString(),
              };
            } catch (parseError) {
              return {
                id: set.id,
                name: set.name,
                words: [],
                isOfficial: false,
                createdAt: set.created_at || new Date().toISOString(),
              };
            }
          });
        setWordSets([OFFICIAL_WORD_SET_1, OFFICIAL_WORD_SET_2, ...parsedSets]);
      } else {
      }
    } catch (error) {
      showMessage('error', '加载自定义词汇集失败: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  // 保存自定义词汇集到数据库
  const saveCustomWordSet = async (
    name: string,
    words: string[],
  ): Promise<WordSet> => {
    const newSet = await invoke<RawWordSet>('save_custom_word_set', {
      name,
      words: JSON.stringify(words),
    });

    // 返回的数据需要解析 words
    return {
      id: newSet.id,
      name: newSet.name,
      words: JSON.parse(newSet.words),
      isOfficial: false,
      createdAt: newSet.created_at || new Date().toISOString(),
    };
  };

  // 删除自定义词汇集
  const deleteCustomWordSet = async (id: number) => {
    try {
      await invoke('delete_custom_word_set', { id });

      setWordSets((prevSets) => prevSets.filter((set) => set.id !== id));
      if (currentSetId === id) {
        setCurrentSetId(-2);
      }
      showMessage('success', '词汇集删除成功！');
    } catch (error) {
      showMessage('error', '删除失败，请重试');
    }
  };

  // 重置游戏状态
  const resetGameState = useCallback(() => {
    setUserInput('');
    setCompletedWords([]);
    setIsActive(false);
    setHistory([]);
    setStats({
      wpm: 0,
      accuracy: 100,
      correctChars: 0,
      incorrectChars: 0,
      totalChars: 0,
      startTime: null,
      endTime: null,
    });
    startTimeRef.current = null;
  }, []);

  // 打乱数组
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // 初始化词汇集
  const initializeWordSet = useCallback(
    (setId: number) => {
      const selectedSet = wordSets.find((set) => set.id === setId);
      if (selectedSet && selectedSet.words.length > 0) {
        // 打乱单词顺序，确保随机性
        const shuffledWords = shuffleArray(selectedSet.words);
        setRemainingWords(shuffledWords.slice(1)); // 剩余单词（除第一个外）
        setCompletedWords([]);

        // 设置第一个单词和中文释义
        const firstWord = shuffledWords[0];
        setCurrentWord(firstWord);
        const meaning = getWordMeaningFromDb(firstWord);
        console.log(
          `Initializing with word: ${firstWord}, meaning: ${meaning}`,
        );
        setCurrentMeaning(meaning);
      }
    },
    [wordSets, meaningsMap],
  );

  // 获取下一个单词
  const getNextWord = useCallback(() => {
    // 如果还有剩余单词
    if (remainingWords.length > 0) {
      // 取出下一个单词（从剩余单词中取第一个）
      const nextWord = remainingWords[0];
      // 更新剩余单词（移除第一个）
      setRemainingWords((prev) => prev.slice(1));
      return nextWord;
    }

    // 没有剩余单词了，完成所有单词
    setIsActive(false);
    if (startTimeRef.current) {
      const endTime = Date.now();
      const timeInMinutes = (endTime - startTimeRef.current) / 60000;
      const wpm = Math.round(stats.correctChars / 5 / timeInMinutes);
      setStats((prev) => ({
        ...prev,
        wpm: wpm || 0,
        endTime: endTime,
      }));
    }
    return null;
  }, [remainingWords, stats.correctChars]);

  // 切换词汇集
  const switchWordSet = (setId: number) => {
    if (isActive) {
      if (window.confirm('切换词汇集会重置当前进度，确定要继续吗？')) {
        resetGameState();
        setCurrentSetId(setId);
        setTimeout(() => {
          initializeWordSet(setId);
        }, 0);
      }
    } else {
      resetGameState();
      setCurrentSetId(setId);
      setTimeout(() => {
        initializeWordSet(setId);
      }, 0);
    }
  };

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserInput(value);

    if (!isActive && value.length > 0) {
      setIsActive(true);
      const startTime = Date.now();
      setStats((prev) => ({ ...prev, startTime: startTime }));
      startTimeRef.current = startTime;
    }

    // 检查是否完成当前单词
    if (value.toLowerCase() === currentWord.toLowerCase()) {
      const wordTime = Date.now();

      // 记录历史
      setHistory((prev) => [
        ...prev,
        {
          word: currentWord,
          correct: true,
          time: wordTime,
        },
      ]);

      // 将当前单词添加到已完成列表
      setCompletedWords((prev) => [...prev, currentWord]);

      // 获取下一个单词
      const nextWord = getNextWord();

      if (nextWord) {
        setCurrentWord(nextWord);
        const meaning = getWordMeaningFromDb(nextWord);
        console.log(`Next word: ${nextWord}, meaning: ${meaning}`);
        setCurrentMeaning(meaning);
        setUserInput('');
      } else {
        // 所有单词完成，清空输入
        setUserInput('');
      }
    }
  };

  // 添加单词-释义对
  const addWordMeaningPair = () => {
    setWordMeaningPairs([...wordMeaningPairs, { word: '', meaning: '' }]);
  };

  // 删除单词-释义对
  const removeWordMeaningPair = (index: number) => {
    const newPairs = wordMeaningPairs.filter((_, i) => i !== index);
    setWordMeaningPairs(newPairs);
  };

  // 更新单词
  const updateWord = (index: number, word: string) => {
    const newPairs = [...wordMeaningPairs];
    newPairs[index].word = word.toLowerCase().trim();
    setWordMeaningPairs(newPairs);
  };

  // 更新释义
  const updateMeaning = (index: number, meaning: string) => {
    const newPairs = [...wordMeaningPairs];
    newPairs[index].meaning = meaning.trim();
    setWordMeaningPairs(newPairs);
  };

  // 添加自定义词汇集（支持自定义释义）
  const handleAddCustomSet = async () => {
    if (!newSetName.trim()) {
      showMessage('error', '请输入词汇集名称');
      return;
    }

    // 过滤掉空单词
    const validPairs = wordMeaningPairs.filter(
      (pair) => pair.word.trim() !== '',
    );

    if (validPairs.length === 0) {
      showMessage('error', '至少添加一个单词');
      return;
    }

    try {
      // 提取单词列表
      const wordsArray = validPairs.map((pair) => pair.word);

      // 保存词汇集
      const newSet = await saveCustomWordSet(newSetName, wordsArray);
      setWordSets((prev) => [...prev, newSet]);

      // 批量保存单词释义到字典表
      const meaningsToUpdate: Record<string, string> = {};
      validPairs.forEach((pair) => {
        meaningsToUpdate[pair.word] = pair.meaning || '暂无释义';
      });

      // 调用批量更新释义的接口
      await invoke('batch_update_meanings', {
        meanings: JSON.stringify(meaningsToUpdate),
      });

      // 重新加载释义
      await loadAllMeanings();

      setShowCustomModal(false);
      setNewSetName('');
      setWordMeaningPairs([{ word: '', meaning: '' }]);
      showMessage(
        'success',
        `词汇集"${newSetName}"添加成功！已添加${validPairs.length}个单词及释义。`,
      );
    } catch (error) {
      showMessage('error', '添加失败: ' + error);
    }
  };

  // 初始化
  useEffect(() => {
    const initialize = async () => {
      await loadCustomWordSets();
      await loadAllMeanings();
      setIsLoading(false);
    };
    initialize();
  }, []);

  // 当前词汇集变化时重新初始化
  useEffect(() => {
    if (
      !isLoading &&
      currentWordSet &&
      currentSetId !== -2 &&
      Object.keys(meaningsMap).length > 0
    ) {
      initializeWordSet(currentSetId);
      inputRef.current?.focus();
    }
  }, [currentSetId, isLoading, initializeWordSet, currentWordSet, meaningsMap]);

  // 高亮显示输入对比
  const renderWordWithHighlight = () => {
    if (!currentWord) return null;

    return currentWord.split('').map((char, index) => {
      let color = 'text-gray-400';
      if (index < userInput.length) {
        color = userInput[index] === char ? 'text-green-600' : 'text-red-500';
      }
      return (
        <span key={index} className={`${color} font-mono text-4xl`}>
          {char}
        </span>
      );
    });
  };

  const exportCurrentWordSet = async () => {
    if (!currentWordSet) {
      console.warn('当前没有选中的词汇集');
      return;
    }

    try {
      const exportData = {
        setName: currentWordSet.name,
        setId: currentWordSet.id,
        isOfficial: currentWordSet.isOfficial,
        totalWords: currentWordSet.words.length,
        currentWord: currentWord,
        completedWords: completedWords,
        remainingWords: remainingWords,
        allWords: currentWordSet.words,
        exportTime: new Date().toISOString(),
      };

      const fileName = `${currentWordSet.name}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;

      const filePath = await save({
        defaultPath: fileName,
        filters: [{ name: 'JSON文件', extensions: ['json'] }],
      });

      if (!filePath) return;

      const jsonString = JSON.stringify(exportData, null, 2);
      const uint8Array = new TextEncoder().encode(jsonString);

      await writeFile(filePath, uint8Array);

      alert(`词汇集已导出至：${filePath}`);
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出失败，请重试');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 to-neutral-900">
      {/* 消息提示 */}
      {message && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
            message.type === 'success'
              ? 'bg-green-500/90 backdrop-blur-sm border border-green-400/30'
              : 'bg-red-500/90 backdrop-blur-sm border border-red-400/30'
          } text-white animate-fade-in`}
        >
          {message.text}
        </div>
      )}

      <div className="flex h-screen">
{/* 左侧主要内容区域 */}
<div className="flex-1 flex flex-col p-8 overflow-y-auto">
  {/* 紧凑的内容区域 */}
  <div className="max-w-5xl mx-auto w-full">
    {/* 当前单词区域 - 水平卡片式布局 */}
    <div className="bg-neutral-900/40 rounded-lg p-6 mb-5">
      <div className="flex items-end justify-between gap-6">
        {/* 左侧：当前单词 */}
        <div className="flex-1">
          <div className="text-neutral-500 text-xs mb-2 tracking-wider">当前单词</div>
          <div className="text-6xl font-bold tracking-wide text-neutral-100 break-all">
            {renderWordWithHighlight()}
          </div>
        </div>

        {/* 分隔线 */}
        <div className="w-px h-16 bg-red-500/30"></div>

        {/* 右侧：中文释义 */}
        {currentMeaning && (
          <div className="flex-1">
            <div className="text-neutral-500 text-xs mb-2 tracking-wider">中文释义</div>
            <div className="text-xl text-cyan-400 font-medium leading-relaxed">
              {currentMeaning}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* 输入框区域 */}
    <div className="mb-4">
      <div className="text-neutral-500 text-xs mb-2 ml-1">输入框</div>
      <input
        ref={inputRef}
        type="text"
        value={userInput}
        onChange={handleInputChange}
        disabled={
          completedWords.length === (currentWordSet?.words.length || 0)
        }
        placeholder={
          completedWords.length === 0
            ? `输入 ${currentWord} (${currentWord?.length || 0} 个字符)`
            : '输入上面的单词...'
        }
        className="w-full px-5 py-3.5 bg-neutral-900/40 border border-red-500/30 rounded-lg text-neutral-100 text-base font-mono focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 transition-all placeholder-neutral-600"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck="false"
      />
    </div>

    {/* 进度条区域 */}
    <div className="bg-neutral-900/40 rounded-lg p-4">
      <div className="flex justify-between items-center text-xs text-neutral-400 mb-2">
        <span className="tracking-wider">练习进度</span>
        <span className="font-mono">
          {completedWords.length} / {currentWordSet?.words.length || 0}
        </span>
      </div>
      <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
        <div
          className="bg-gradient-to-r from-red-500 to-red-600 h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${(completedWords.length / (currentWordSet?.words.length || 1)) * 100}%`,
          }}
        />
      </div>
      {/* 进度百分比显示 */}
      <div className="text-right text-xs text-neutral-600 mt-1">
        {Math.round((completedWords.length / (currentWordSet?.words.length || 1)) * 100)}%
      </div>
    </div>

    {/* 完成提示 */}
    {completedWords.length === (currentWordSet?.words.length || 0) && (
      <div className="mt-5 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full">
          <span className="text-green-400">✓</span>
          <span className="text-green-400 font-medium">恭喜！你完成了所有单词！</span>
        </div>
      </div>
    )}
  </div>
</div>

        {/* 右侧词汇集选择器 - 占 25% */}
        <div className="w-80 bg-neutral-900/40 backdrop-blur-sm border-l border-red-500/20 p-6 overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-neutral-300 font-semibold text-base mb-3">词汇集</h3>
            <button
              onClick={() => setShowCustomModal(true)}
              className="w-full py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 hover:border-red-500/50 transition-all text-sm font-medium"
            >
              + 新建词汇集
            </button>
          </div>

          <div className="space-y-3">
            {wordSets.map((set) => (
              <div key={set.id} className="relative">
                <button
                  onClick={() => switchWordSet(set.id)}
                  className={`w-full p-3 rounded-lg border transition-all text-left ${
                    currentSetId === set.id
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-red-500/20 hover:border-red-500/40 bg-transparent'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div
                        className={`font-medium ${currentSetId === set.id ? 'text-red-400' : 'text-neutral-300'}`}
                      >
                        {set.name}
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        {set.words.length} 个单词
                      </div>
                    </div>
                    {set.isOfficial ? (
                      <span className="text-xs text-neutral-500 px-2 py-0.5">
                        官方
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportCurrentWordSet();
                        }}
                        className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors px-2 py-0.5"
                      >
                        导出
                      </button>
                    )}
                  </div>
                </button>
                {!set.isOfficial && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`确定要删除"${set.name}"吗？`)) {
                        deleteCustomWordSet(set.id);
                      }
                    }}
                    className="absolute -top-2 -right-2 bg-red-500/80 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 自定义词汇集模态框 */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-red-500/20">
            <div className="p-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent mb-4">
                创建自定义词汇集
              </h2>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-neutral-300 mb-2">
                  词汇集名称
                </label>
                <input
                  type="text"
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  placeholder="例如：雅思词汇"
                  className="w-full px-4 py-2 bg-neutral-800 border border-red-500/30 rounded-lg focus:outline-none focus:border-red-500 text-neutral-200 placeholder-neutral-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-neutral-300 mb-2">
                  单词和释义列表
                </label>
                <div className="space-y-3">
                  {wordMeaningPairs.map((pair, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={pair.word}
                          onChange={(e) => updateWord(index, e.target.value)}
                          placeholder="英文单词"
                          className="w-full px-4 py-2 bg-neutral-800 border border-red-500/30 rounded-lg focus:outline-none focus:border-red-500 text-neutral-200 placeholder-neutral-500"
                        />
                      </div>
                      <div className="flex-[2]">
                        <input
                          type="text"
                          value={pair.meaning}
                          onChange={(e) => updateMeaning(index, e.target.value)}
                          placeholder="中文释义"
                          className="w-full px-4 py-2 bg-neutral-800 border border-red-500/30 rounded-lg focus:outline-none focus:border-red-500 text-neutral-200 placeholder-neutral-500"
                        />
                      </div>
                      {wordMeaningPairs.length > 1 && (
                        <button
                          onClick={() => removeWordMeaningPair(index)}
                          className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors border border-red-500/30"
                        >
                          删除
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={addWordMeaningPair}
                  className="mt-3 px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors text-sm border border-red-500/30"
                >
                  + 添加单词
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAddCustomSet}
                  className="flex-1 px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-lg shadow-red-500/25"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setShowCustomModal(false);
                    setNewSetName('');
                    setWordMeaningPairs([{ word: '', meaning: '' }]);
                  }}
                  className="flex-1 px-6 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors border border-red-500/30"
                >
                  取消
                </button>
              </div>

              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-neutral-400">
                  💡 提示：每个单词都会保存到字典中，以后创建其他词汇集时可以直接使用。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default TypingPractice;