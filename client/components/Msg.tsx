import React from 'react';
import { create } from 'zustand';

/* ==================== 消息类型 ==================== */
export type MsgType = 'info' | 'success' | 'error';

interface MsgItem {
  id: number;
  text: string;
  type: MsgType;
  duration: number; // ms
}

/* ==================== 全局消息 Store（使用 Zustand） ==================== */
interface MsgStore {
  list: MsgItem[];
  addMsg: (text: string, type?: MsgType, duration?: number) => void;
  removeMsg: (id: number) => void;
}

const useMsgStore = create<MsgStore>((set, get) => ({
  list: [],
  addMsg: (text, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    const newMsg: MsgItem = { id, text, type, duration };
    set((state) => ({ list: [...state.list, newMsg] }));
    // 自动移除
    setTimeout(() => {
      const currentList = get().list;
      if (currentList.find((m) => m.id === id)) {
        get().removeMsg(id);
      }
    }, duration);
  },
  removeMsg: (id) => {
    set((state) => ({ list: state.list.filter((m) => m.id !== id) }));
  },
}));

/* ==================== useMsg Hook ==================== */
export const useMsg = () => {
  const addMsg = useMsgStore((s) => s.addMsg);
  const showMsg = (
    text: string,
    type?: MsgType,
    duration?: number,
    delay?: number,
  ) => {
    if (delay) {
      setTimeout(() => addMsg(text, type, duration), delay);
    } else {
      addMsg(text, type, duration);
    }
  };

  return { showMsg };
};

/* ==================== 消息条目组件 ==================== */
const MsgItemComp: React.FC<{
  item: MsgItem;
  onClose: (id: number) => void;
}> = ({ item, onClose }) => {
  const typeStyles: Record<
    MsgType,
    { bg: string; icon: string; border: string }
  > = {
    info: {
      bg: 'bg-blue-900/80',
      icon: 'ℹ️',
      border: 'border-blue-500',
    },
    success: {
      bg: 'bg-emerald-900/80',
      icon: '✅',
      border: 'border-emerald-500',
    },
    error: {
      bg: 'bg-red-900/80',
      icon: '❌',
      border: 'border-red-500',
    },
  };
  const style = typeStyles[item.type];

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl
        border-l-4 ${style.border} ${style.bg}
        backdrop-blur-sm text-white text-sm
        animate-slide-in-right
      `}
    >
      <span className="text-lg">{style.icon}</span>
      <span className="flex-1">{item.text}</span>
      <button
        onClick={() => onClose(item.id)}
        className="ml-2 text-neutral-400 bg-transparent hover:text-white transition-colors cursor-pointer"
      >
        ✕
      </button>
    </div>
  );
};

/* ==================== 消息容器组件 ==================== */
export const MsgContainer: React.FC = () => {
  const list = useMsgStore((s) => s.list);
  const removeMsg = useMsgStore((s) => s.removeMsg);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {list.map((item) => (
        <div key={item.id} className="pointer-events-auto">
          <MsgItemComp item={item} onClose={removeMsg} />
        </div>
      ))}

      {/* 动画关键帧 */}
      <style>{`
        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.35s ease-out;
        }
      `}</style>
    </div>
  );
};
