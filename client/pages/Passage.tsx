// Passage.tsx — 打字练习（段落模式）
//
// 设计要点：
// 1. 数据单元就是「段落」，没有集合层。每条段落都是小作文长度。
// 2. 打字时逐字符高亮对比，支持退格、空格、标点、多行。
// 3. 在段落上划词即调用百度翻译，译文展示在段落正下方。
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Passage, TranslationResult } from '../interface/typing';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';

const TypingPractice: React.FC = () => {
  // ---------- 数据 ----------
  const [passages, setPassages] = useState<Passage[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 段落列表抽屉
  const [listOpen, setListOpen] = useState<boolean>(false);

  // ---------- 打字状态 ----------
  const [userInput, setUserInput] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(false);

  // ---------- 划词翻译 ----------
  const [selectedText, setSelectedText] = useState<string>('');
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [translating, setTranslating] = useState<boolean>(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const lastTranslatedRef = useRef<string>('');

  // ---------- 新增段落 ----------
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [draftTitle, setDraftTitle] = useState<string>('');
  const [draftContent, setDraftContent] = useState<string>('');

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const passageRef = useRef<HTMLDivElement>(null);
  // 用 ref 记录当前输入，避免闭包读到旧值
  const userInputRef = useRef<string>('');

  const current = passages[currentIndex] || null;
  const targetText = current?.content || '';

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // ---------- 加载 ----------
  const loadPassages = useCallback(async (keepIndex = false) => {
    try {
      setIsLoading(true);
      const list = await invoke<Passage[]>('get_all_passages');
      setPassages(list);
      if (!keepIndex || list.length === 0) {
        setCurrentIndex(0);
      } else {
        setCurrentIndex((prev) => Math.min(prev, list.length - 1));
      }
    } catch (error) {
      console.error('加载段落失败:', error);
      showMessage('error', '加载段落失败: ' + error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPassages();
  }, [loadPassages]);

  // ---------- 重置当前段落 ----------
  const resetTyping = useCallback(() => {
    setUserInput('');
    userInputRef.current = '';
    setIsActive(false);
    startTimeRef.current = null;
    setSelectedText('');
    setTranslation(null);
    setTranslateError(null);
    lastTranslatedRef.current = '';
    window.getSelection()?.removeAllRanges();
  }, []);

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= passages.length) return;
      resetTyping();
      setCurrentIndex(index);
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [passages.length, resetTyping],
  );

  // 切段时聚焦输入框
  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [currentIndex, isLoading]);

  // ---------- 划词翻译 ----------
  const translateSelection = useCallback(async (text: string) => {
    const query = text.trim();
    if (!query) return;
    if (query === lastTranslatedRef.current) return;
    lastTranslatedRef.current = query;

    setTranslating(true);
    setTranslateError(null);
    try {
      const result = await invoke<TranslationResult>('translate_text', {
        text: query,
        from: null,
        to: null,
      });
      setTranslation(result);
    } catch (e) {
      setTranslation(null);
      setTranslateError(String(e));
    } finally {
      setTranslating(false);
    }
  }, []);

  // 选区必须落在当前段落容器内才触发翻译
  const readSelection = useCallback(
    (requireCollapsed = true) => {
      const sel = window.getSelection();
      if (!sel) return;
      if (requireCollapsed && sel.isCollapsed) return;

      const text = sel.toString().trim();
      if (!text) return;

      const container = passageRef.current;
      if (container && sel.anchorNode && !container.contains(sel.anchorNode)) return;

      setSelectedText(text);
      translateSelection(text);
    },
    [translateSelection],
  );

  const handlePassageMouseUp = useCallback(() => readSelection(true), [readSelection]);

  // 双击选词、键盘 Shift+方向键选择也覆盖到
  useEffect(() => {
    const handler = () => readSelection(false);
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, [readSelection]);

  const clearTranslation = () => {
    setSelectedText('');
    setTranslation(null);
    setTranslateError(null);
    lastTranslatedRef.current = '';
    window.getSelection()?.removeAllRanges();
  };

  // ---------- 打字 ----------
  // 只做输入与逐字符高亮对比，不统计速度、正确率等指标。
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // 段落是单段连续文本，把换行折叠成空格，避免与目标文本错位
    const value = e.target.value.replace(/\r?\n/g, ' ');
    if (value.length > targetText.length) return;

    if (!isActive && value.length > 0) {
      setIsActive(true);
      startTimeRef.current = Date.now();
    }

    userInputRef.current = value;
    setUserInput(value);

    if (value === targetText) {
      setIsActive(false);
    }
  };

  // ---------- 新增段落 ----------
  const handleAddPassage = async () => {
    const content = draftContent.trim();
    if (!content) {
      showMessage('error', '段落内容不能为空');
      return;
    }
    try {
      await invoke<Passage>('add_passage', {
        title: draftTitle.trim(),
        content,
      });
      await loadPassages(true);
      setShowAddModal(false);
      setDraftTitle('');
      setDraftContent('');
      showMessage('success', '段落已添加');
      // 跳到新添加的段落
      setTimeout(() => {
        const last = passages.length; // 新段落在末尾之后
        goTo(last);
      }, 0);
    } catch (error) {
      showMessage('error', '添加失败: ' + error);
    }
  };

  const handleDelete = async (p: Passage) => {
    if (p.is_official) return;
    if (!window.confirm('确定要删除这一段吗？')) return;
    try {
      await invoke('delete_passage', { id: p.id });
      const nextIndex = Math.max(0, currentIndex >= passages.length - 1 ? currentIndex - 1 : currentIndex);
      resetTyping();
      await loadPassages();
      setCurrentIndex(nextIndex);
      showMessage('success', '段落已删除');
    } catch (error) {
      showMessage('error', '删除失败: ' + error);
    }
  };

  // ---------- 渲染 ----------
  const renderHighlighted = () => {
    if (!targetText) return null;
    return Array.from(targetText).map((char, index) => {
      let cls = 'text-neutral-500';
      if (index < userInput.length) {
        cls = userInput[index] === char ? 'text-green-400' : 'text-red-500 bg-red-500/20';
      } else if (index === userInput.length && isActive) {
        cls = 'text-neutral-100 bg-red-500/40';
      }
      // 空格用不换行空格渲染，保证高亮背景可见
      const display = char === ' ' ? '\u00A0' : char;
      return (
        <span key={index} className={cls}>
          {display}
        </span>
      );
    });
  };

  const done = !!targetText && userInput === targetText;
  const customCount = passages.filter((p) => !p.is_official).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 to-neutral-900">
      {message && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
            message.type === 'success'
              ? 'bg-green-500/90 border border-green-400/30'
              : 'bg-red-500/90 border border-red-400/30'
          } text-white animate-fade-in`}
        >
          {message.text}
        </div>
      )}

      <div className="h-screen flex flex-col p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full">
          {/* 顶部：段落信息 + 操作 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-neutral-500 text-xs tracking-wider shrink-0">当前段落</span>
              <span className="text-cyan-400 text-sm font-medium truncate">
                {current?.title || '未命名'}
              </span>
              {current?.is_official && (
                <span className="text-[11px] text-neutral-500 border border-neutral-700 rounded px-1.5 py-0.5 shrink-0">
                  内置
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-neutral-500">划选文字即可查看翻译</span>
              <button
                onClick={() => setListOpen(true)}
                className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors text-sm font-medium"
              >
                段落列表 ({passages.length})
              </button>
            </div>
          </div>

          {/* 目标段落（可划词） */}
          <div
            ref={passageRef}
            onMouseUp={handlePassageMouseUp}
            onDoubleClick={handlePassageMouseUp}
            className="bg-neutral-900/40 border border-red-500/20 rounded-lg p-6 select-text cursor-text"
          >
            {targetText ? (
              <p className="font-mono text-lg leading-[2.1] tracking-wide break-words">
                {renderHighlighted()}
              </p>
            ) : (
              <p className="text-neutral-500">还没有段落，点击右上角「添加段落」新建一条。</p>
            )}
          </div>

          {/* 划词翻译结果 —— 展示在段落正下方 */}
          {(selectedText || translating || translateError) && (
            <div className="mt-3 bg-neutral-900/70 border border-cyan-500/30 rounded-lg p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="text-neutral-500 text-xs tracking-wider mb-1">选中的原文</div>
                  <div className="text-neutral-300 text-sm break-words">{selectedText}</div>
                </div>
                <button
                  onClick={clearTranslation}
                  className="shrink-0 px-3 py-1 text-xs text-neutral-500 hover:text-neutral-200 border border-neutral-700 hover:border-neutral-500 rounded transition-colors"
                >
                  关闭
                </button>
              </div>

              <div className="border-t border-neutral-800 pt-3">
                <div className="text-neutral-500 text-xs tracking-wider mb-1">
                  百度翻译{translation?.to_lang ? `（→ ${translation.to_lang}）` : ''}
                </div>
                {translating && <div className="text-cyan-400 text-sm">翻译中...</div>}
                {!translating && translateError && (
                  <div className="text-red-400 text-sm whitespace-pre-wrap">{translateError}</div>
                )}
                {!translating && !translateError && translation && (
                  <div className="text-cyan-300 text-base leading-relaxed whitespace-pre-wrap break-words">
                    {translation.target}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 输入区 */}
          <textarea
            ref={inputRef}
            value={userInput}
            onChange={handleInputChange}
            disabled={!targetText}
            rows={4}
            placeholder={
              targetText
                ? done
                  ? '本段已完成，可切换到下一段'
                  : '在此输入上方段落...'
                : '暂无可练习段落'
            }
            className="mt-4 w-full px-5 py-3.5 bg-neutral-900/40 border border-red-500/30 rounded-lg text-neutral-100 text-base font-mono leading-relaxed focus:outline-none focus:border-red-500 transition-all placeholder-neutral-600 resize-none"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
          />

          {/* 统计与导航 */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => goTo(currentIndex - 1)}
              disabled={currentIndex <= 0}
              className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm border border-red-500/20"
            >
              上一段
            </button>
            <button
              onClick={() => goTo(currentIndex + 1)}
              disabled={currentIndex >= passages.length - 1}
              className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm border border-red-500/30"
            >
              下一段
            </button>
            <button
              onClick={() => {
                resetTyping();
                inputRef.current?.focus();
              }}
              className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors text-sm border border-red-500/20"
            >
              重打本段
            </button>

            <div className="flex-1" />

            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors text-sm font-medium"
            >
              + 添加段落
            </button>
            {current && !current.is_official && (
              <button
                onClick={() => handleDelete(current)}
                className="px-4 py-2 bg-neutral-800 text-neutral-400 rounded-lg hover:bg-red-500/20 hover:text-red-300 transition-colors text-sm border border-neutral-700"
              >
                删除本段
              </button>
            )}
          </div>

          {/* 本段完成提示 */}
          {done && (
            <div className="mt-5 text-center">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full">
                <span className="text-green-400">✓</span>
                <span className="text-green-400 font-medium">本段完成</span>
              </span>
            </div>
          )}

          {/* 段落定位 */}
          <div className="mt-4 flex items-center justify-between text-xs text-neutral-600">
            <span className="font-mono">
              第 {currentIndex + 1} / {passages.length} 段
              {customCount > 0 ? `（自定义 ${customCount}）` : ''}
            </span>
            <span>内置段落不可删除</span>
          </div>

          {/* 翻译配置提示（未配置时不打扰，仅在无译文时展示） */}
          {translateError && translateError.includes('未配置') && (
            <div className="mt-4 p-3 bg-neutral-900/60 border border-neutral-800 rounded-lg">
              <div className="text-neutral-500 text-xs mb-1">未配置百度翻译密钥</div>
              <pre className="text-[11px] text-neutral-400 font-mono whitespace-pre-wrap">
{`在 src-tauri/.env 中添加：
BAIDU_TRANS_APPID=你的appid
BAIDU_TRANS_KEY=你的密钥`}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* 段落列表抽屉 */}
      <Drawer
        isOpen={listOpen}
        onClose={() => setListOpen(false)}
        title={`段落列表 (${passages.length})`}
        position="right"
        width="w-96"
      >
        <div className="space-y-2">
          {passages.length === 0 && (
            <p className="text-neutral-500 text-sm p-2">还没有段落，先添加一条吧。</p>
          )}
          {passages.map((p, i) => (
            <div
              key={p.id}
              className={`group flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                i === currentIndex
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-neutral-800 hover:border-red-500/40 bg-neutral-900/40'
              }`}
              onClick={() => {
                goTo(i);
                setListOpen(false);
              }}
            >
              <span
                className={`font-mono text-xs shrink-0 mt-0.5 ${
                  i === currentIndex ? 'text-red-400' : 'text-neutral-600'
                }`}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-sm font-medium truncate ${
                      i === currentIndex ? 'text-red-300' : 'text-neutral-300'
                    }`}
                  >
                    {p.title || '未命名'}
                  </span>
                  {p.is_official && (
                    <span className="text-[10px] text-neutral-500 border border-neutral-700 rounded px-1 py-0.5 shrink-0">
                      内置
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                  {p.content.slice(0, 60)}
                  {p.content.length > 60 ? '…' : ''}
                </p>
              </div>
              {!p.is_official && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!window.confirm('确定要删除这一段吗？')) return;
                    invoke('delete_passage', { id: p.id })
                      .then(async () => {
                        await loadPassages();
                        showMessage('success', '段落已删除');
                      })
                      .catch((err) => showMessage('error', '删除失败: ' + err));
                  }}
                  className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                  title="删除"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            setListOpen(false);
            setShowAddModal(true);
          }}
          className="mt-4 w-full py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-all text-sm font-medium"
        >
          + 添加段落
        </button>
      </Drawer>

      {/* 添加段落模态框 */}
      <Modal title="添加段落" isOpen={showAddModal} onClose={() => setShowAddModal(false)}>
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-neutral-300 mb-2">
              段落标题（可选）
            </label>
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="例如：The Quiet Morning"
              className="w-full px-4 py-2 bg-neutral-800 border border-red-500/30 rounded-lg focus:outline-none focus:border-red-500 text-neutral-200 placeholder-neutral-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-neutral-300 mb-2">
              段落正文
            </label>
            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              placeholder="粘贴或输入整段文本。段落建议长一些，接近一篇小作文。"
              rows={12}
              className="w-full px-4 py-3 bg-neutral-800 border border-red-500/30 rounded-lg focus:outline-none focus:border-red-500 text-neutral-200 leading-relaxed placeholder-neutral-500 resize-none"
            />
            <div className="text-xs text-neutral-600 mt-1 text-right">
              {draftContent.length} 字符
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleAddPassage}
              className="flex-1 px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all"
            >
              添加
            </button>
            <button
              onClick={() => {
                setShowAddModal(false);
                setDraftTitle('');
                setDraftContent('');
              }}
              className="flex-1 px-6 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors border border-red-500/30"
            >
              取消
            </button>
          </div>

          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-neutral-400">
              💡 每条就是一段完整文本，直接加入练习库，不再需要先建集合。
            </p>
          </div>
        </div>
      </Modal>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default TypingPractice;
