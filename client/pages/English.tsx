// TypingPractice.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';

// 单词库
const WORD_SET = [
  'apple', 'beautiful', 'computer', 'developer', 'experience',
  'fantastic', 'github', 'hello', 'internet', 'javascript',
  'knowledge', 'learning', 'mountain', 'network', 'open source',
  'programming', 'quality', 'react', 'software', 'technology',
  'unique', 'virtual', 'website', 'xenial', 'youtube',
  'zealous', 'algorithm', 'backend', 'cloud', 'database'
];

// 类型定义
interface TypingStats {
  wpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  totalChars: number;
  startTime: number | null;
  endTime: number | null;
}

const TypingPractice: React.FC = () => {
  const [currentWord, setCurrentWord] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [score, setScore] = useState<number>(0);
  const [completedWords, setCompletedWords] = useState<string[]>([]);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [stats, setStats] = useState<TypingStats>({
    wpm: 0,
    accuracy: 100,
    correctChars: 0,
    incorrectChars: 0,
    totalChars: 0,
    startTime: null,
    endTime: null,
  });
  const [history, setHistory] = useState<Array<{ word: string; correct: boolean; time: number }>>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number | null>(null);

  // 随机获取新单词
  const getNewWord = useCallback(() => {
    const remainingWords = WORD_SET.filter(word => !completedWords.includes(word));
    if (remainingWords.length === 0) {
      setIsActive(false);
      if (startTimeRef.current) {
        const endTime = Date.now();
        calculateFinalStats(endTime);
      }
      return;
    }
    const randomIndex = Math.floor(Math.random() * remainingWords.length);
    setCurrentWord(remainingWords[randomIndex]);
  }, [completedWords]);

  // 计算最终统计
  const calculateFinalStats = (endTime: number) => {
    if (stats.startTime) {
      const timeInMinutes = (endTime - stats.startTime) / 60000;
      const wpm = Math.round((stats.correctChars / 5) / timeInMinutes);
      setStats(prev => ({
        ...prev,
        wpm: wpm || 0,
        endTime: endTime
      }));
    }
  };

  // 更新实时统计
  const updateStats = (input: string, currentWordText: string) => {
    let correct = 0;
    let incorrect = 0;
    
    for (let i = 0; i < input.length; i++) {
      if (i < currentWordText.length && input[i] === currentWordText[i]) {
        correct++;
      } else {
        incorrect++;
      }
    }
    
    const totalChars = correct + incorrect;
    const accuracy = totalChars > 0 ? (correct / totalChars) * 100 : 100;
    
    setStats(prev => ({
      ...prev,
      correctChars: correct,
      incorrectChars: incorrect,
      totalChars: totalChars,
      accuracy: accuracy,
    }));
  };

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserInput(value);
    
    if (!isActive && value.length > 0) {
      setIsActive(true);
      const startTime = Date.now();
      setStats(prev => ({ ...prev, startTime: startTime }));
      startTimeRef.current = startTime;
    }
    
    updateStats(value, currentWord);
    
    // 检查是否完成当前单词
    if (value.toLowerCase() === currentWord.toLowerCase()) {
      const wordTime = Date.now();
      const isCorrect = value.toLowerCase() === currentWord.toLowerCase();
      
      // 更新分数
      if (isCorrect) {
        setScore(prev => prev + 10);
      }
      
      // 记录历史
      setHistory(prev => [...prev, {
        word: currentWord,
        correct: isCorrect,
        time: wordTime
      }]);
      
      // 标记为已完成
      setCompletedWords(prev => [...prev, currentWord]);
      
      // 重置输入并获取新单词
      setUserInput('');
      getNewWord();
    }
  };

  // 重置游戏
  const resetGame = () => {
    setUserInput('');
    setScore(0);
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
    getNewWord();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // 初始化
  useEffect(() => {
    getNewWord();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // 计算 WPM（每分钟单词数）
  useEffect(() => {
    if (stats.startTime && isActive) {
      const now = Date.now();
      const timeInMinutes = (now - stats.startTime) / 60000;
      const wpm = Math.round((stats.correctChars / 5) / timeInMinutes);
      setStats(prev => ({ ...prev, wpm: wpm || 0 }));
    }
  }, [stats.correctChars, stats.startTime, isActive]);

  // 高亮显示输入对比
  const renderWordWithHighlight = () => {
    return currentWord.split('').map((char, index) => {
      let color = 'text-gray-400'; // 未输入
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

  return (
    <div className="min-h-screen bg-white py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
            English Typing Practice
          </h1>
          <p className="text-gray-600">Type the words as fast and accurately as you can!</p>
        </div>

        {/* 统计面板 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center shadow-sm border border-blue-200">
            <div className="text-gray-600 text-sm mb-1">Score</div>
            <div className="text-3xl font-bold text-blue-600">{score}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center shadow-sm border border-purple-200">
            <div className="text-gray-600 text-sm mb-1">WPM</div>
            <div className="text-3xl font-bold text-purple-600">{stats.wpm}</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center shadow-sm border border-green-200">
            <div className="text-gray-600 text-sm mb-1">Accuracy</div>
            <div className="text-3xl font-bold text-green-600">{stats.accuracy.toFixed(1)}%</div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 text-center shadow-sm border border-orange-200">
            <div className="text-gray-600 text-sm mb-1">Words Completed</div>
            <div className="text-3xl font-bold text-orange-600">{completedWords.length}</div>
          </div>
        </div>

        {/* 主要游戏区域 */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 mb-8 shadow-md border border-gray-200">
          {/* 当前单词显示 */}
          <div className="text-center mb-8">
            <div className="text-gray-600 text-sm mb-2">Current Word</div>
            <div className="text-6xl font-bold tracking-wider mb-4">
              {renderWordWithHighlight()}
            </div>
            <div className="text-gray-500 text-sm">Length: {currentWord.length} characters</div>
          </div>

          {/* 输入框 */}
          <div className="mb-6">
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={handleInputChange}
              disabled={!isActive && completedWords.length === WORD_SET.length}
              placeholder={!isActive && completedWords.length === 0 ? "Click here and start typing..." : "Type the word above..."}
              className="w-full px-6 py-4 bg-white border-2 border-gray-300 rounded-xl text-gray-800 text-xl font-mono focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-gray-400"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />
          </div>

          {/* 提示信息 */}
          <div className="text-center text-gray-600 text-sm">
            {completedWords.length === WORD_SET.length ? (
              <div className="text-green-600 font-semibold">
                🎉 Congratulations! You've completed all words! 🎉
              </div>
            ) : (
              <div>
                Press <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">Enter</kbd> to submit word • 
                Case insensitive • Focus on accuracy first!
              </div>
            )}
          </div>
        </div>

        {/* 历史记录和按钮 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 控制按钮 */}
          <div className="lg:col-span-1">
            <button
              onClick={resetGame}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-md text-white"
            >
              🔄 New Game
            </button>
            
            {/* 实时统计详情 */}
            <div className="mt-4 bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h3 className="text-gray-800 font-semibold mb-3">Live Statistics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Correct Characters:</span>
                  <span className="text-green-600 font-semibold">{stats.correctChars}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Incorrect Characters:</span>
                  <span className="text-red-600 font-semibold">{stats.incorrectChars}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Typed:</span>
                  <span className="text-blue-600 font-semibold">{stats.totalChars}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={isActive ? 'text-green-600 font-semibold' : 'text-yellow-600 font-semibold'}>
                    {isActive ? 'Typing...' : 'Ready'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 历史记录 */}
          <div className="lg:col-span-2">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h3 className="text-gray-800 font-semibold mb-3">Recent Words</h3>
              <div className="max-h-64 overflow-y-auto">
                {history.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    No words typed yet. Start typing to see history!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.slice().reverse().map((item, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg flex justify-between items-center ${
                          item.correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className={item.correct ? 'text-green-600' : 'text-red-600'}>
                            {item.correct ? '✓' : '✗'}
                          </span>
                          <span className="text-gray-800 font-mono">{item.word}</span>
                        </div>
                        <span className="text-gray-500 text-sm">
                          {new Date(item.time).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 进度条 */}
        <div className="mt-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{completedWords.length} / {WORD_SET.length} words</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedWords.length / WORD_SET.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingPractice;