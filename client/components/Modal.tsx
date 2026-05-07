import React, { useEffect, useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  animationType?: 'fade' | 'slide-up' | 'slide-down' | 'scale' | 'bounce' | 'flip';
  backdropBlur?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
  animationType = 'fade',
  backdropBlur = true,
  size = 'md',
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // ESC键关闭
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [isOpen]);

  // 处理动画状态
  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      setTimeout(() => {
        setIsAnimating(true);
      }, 10);
    } else {
      setIsAnimating(false);
      setTimeout(() => {
        setIsMounted(false);
      }, 300);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const getAnimationClasses = () => {
    const baseClasses = "transition-all duration-300 ease-out";
    switch (animationType) {
      case 'fade':
        return `${baseClasses} ${isAnimating ? 'opacity-100' : 'opacity-0'}`;
      case 'slide-up':
        return `${baseClasses} ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`;
      case 'slide-down':
        return `${baseClasses} ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`;
      case 'scale':
        return `${baseClasses} ${isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`;
      case 'bounce':
        return `${baseClasses} ${isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`;
      case 'flip':
        return `${baseClasses} ${isAnimating ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-12'}`;
      default:
        return `${baseClasses} ${isAnimating ? 'opacity-100' : 'opacity-0'}`;
    }
  };

  const backdropClasses = `absolute inset-0 bg-black/70 transition-all duration-300 ease-out ${
    backdropBlur ? 'backdrop-blur-sm' : ''
  } ${isAnimating ? 'opacity-100' : 'opacity-0'}`;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }[size];

  if (!isMounted) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      {/* 遮罩层 */}
      <div className={backdropClasses} aria-hidden="true" />

      {/* 弹窗内容 - 红黑风格 */}
      <div
        className={`relative bg-gradient-to-b from-neutral-900 to-red-950 border border-red-500/30 rounded-2xl shadow-2xl w-full ${sizeClasses} max-h-[90vh] overflow-y-auto ${getAnimationClasses()}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 - 红黑风格 */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-red-500/30">
            {title && (
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <span className="text-red-500">⚙️</span>
                {title}
              </h3>
            )}

            {showCloseButton && (
              <button
                onClick={handleClose}
                className="ml-auto p-2 hover:bg-red-500/20 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
                aria-label="关闭弹窗"
              >
                <svg
                  className="w-5 h-5 text-neutral-400 transition-colors duration-200 hover:text-red-400"
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
        <div className="p-6 text-neutral-300">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
