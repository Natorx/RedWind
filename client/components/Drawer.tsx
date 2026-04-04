// Drawer.tsx
import React, { useEffect } from 'react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: 'left' | 'right';
  width?: string;
  showCloseButton?: boolean;
}

const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
  width = 'w-80 md:w-96',
  showCloseButton = true
}) => {
  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // 点击遮罩层关闭
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // ESC键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  return (
    <>
      {/* 遮罩层 */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* 抽屉主体 */}
      <div
        className={`fixed top-0 h-full z-50 bg-white shadow-xl transition-transform duration-300 ease-in-out ${
          position === 'left' ? 'left-0' : 'right-0'
        } ${width} ${
          isOpen
            ? 'translate-x-0'
            : position === 'left'
            ? '-translate-x-full'
            : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
      >
        {/* 标题栏 */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            {title && (
              <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-300 rounded-md transition-colors border-none cursor-pointer"
                aria-label="关闭抽屉"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* 内容区域 */}
        <div className="h-[calc(100%-4rem)] overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </>
  );
};

export default Drawer;
