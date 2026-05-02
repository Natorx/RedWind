import { useState } from 'react';
import iconSrc from '../assets/icon.png';
import { startPage_latestFeatures } from '../config/startItem.config';
import { useActiveItem } from '../context/activeItemContext';
import { useModuleStore } from '../stores/moduleItemsStore';

const StartPage: React.FC = () => {
  const { sidebarItems } = useModuleStore();
  const { setActiveItem } = useActiveItem();
  const [showIntro, setShowIntro] = useState(false);

  // 快速开始：前3个已导入的模块
  const quickStartItems = sidebarItems.slice(0, 3);

  const handleNavigate = (id: string) => {
    setActiveItem(id);
  };

  const handleLogoClick = () => {
    setShowIntro(!showIntro);
  };

  return (
    <div className="flex h-full min-h-screen bg-gradient-to-br from-red-950 to-neutral-900 relative overflow-hidden">
      {/* 边缘特效 - 持续动画 */}
      <div className={`
        absolute inset-0 pointer-events-none z-20
        ${showIntro ? 'opacity-100' : 'opacity-0'}
        transition-opacity duration-500
      `}>
        {/* 上边缘扫描线 */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-scan-top"></div>
        {/* 右边缘扫描线 */}
        <div className="absolute top-0 right-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-red-500 to-transparent animate-scan-right"></div>
        {/* 下边缘扫描线 */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-scan-bottom"></div>
        {/* 左边缘扫描线 */}
        <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-red-500 to-transparent animate-scan-left"></div>
        
        {/* 四个角的闪光特效 */}
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-red-500/80 rounded-tl-lg animate-pulse-glow"></div>
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-red-500/80 rounded-tr-lg animate-pulse-glow"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-red-500/80 rounded-bl-lg animate-pulse-glow"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-red-500/80 rounded-br-lg animate-pulse-glow"></div>
      </div>

      {/* 左侧 - Logo 和信息 */}
      <div
        className={`
          flex-1 flex flex-col items-center justify-center p-8 
          transition-all duration-700 ease-out
          ${showIntro ? '-translate-x-12' : 'translate-x-0'}
        `}
      >
        <div className="text-center animate-in fade-in slide-in-from-left-4 duration-500">
          {/* Logo */}
          <div
            className="mb-6 inline-block cursor-pointer group"
            onClick={handleLogoClick}
          >
            <div className={`w-28 h-28 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 p-0.5 shadow-lg transition-all duration-300 group-hover:scale-105 ${showIntro ? 'animate-logo-pulse' : 'animate-in zoom-in'}`}>
              <div className="w-full h-full rounded-2xl bg-neutral-900 flex items-center justify-center overflow-hidden">
                <img
                  src={iconSrc}
                  alt="Red Wind"
                  className="w-20 h-20 object-contain"
                />
              </div>
            </div>
          </div>

          <h1 className="text-5xl font-bold bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent mb-3">
            Red Wind
          </h1>

          <p className="text-neutral-400 text-lg mb-6">
            轻量便捷的工具库，你的个人小助手
          </p>

          <div className="w-20 h-1 bg-gradient-to-r from-red-500 to-red-700 rounded-full mx-auto mb-8"></div>

          <div className="flex flex-col gap-3 text-neutral-500">
            <div className="flex items-center gap-2 justify-center">
              <span className="text-red-500">⚡</span>
              <span className="text-neutral-300">快速访问常用工具</span>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <span className="text-red-500">🎨</span>
              <span className="text-neutral-300">享受简洁的界面体验</span>
            </div>
          </div>
        </div>
      </div>

      {/* 浮动的介绍文字 - 无背景，淡入效果 */}
      <div
        className={`
          absolute top-1/2 transform -translate-y-1/2
          transition-all duration-700 ease-out pointer-events-none
          ${
            showIntro
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 -translate-x-8 pointer-events-none'
          }
        `}
        style={{ left: '42%' }}
      >
        <div className="text-center space-y-3">
          <div className="text-red-400/50 text-xs tracking-wider">
            ABOUT RED WIND
          </div>
          <p className="text-neutral-300/50 text-sm leading-relaxed max-w-xs">
            集成常用工具、实用系统工具
            <br />
            快捷操作，提升工作效率
          </p>
          <div className="text-neutral-400/40 text-xs leading-relaxed">
            ⚡ 轻量快速 &nbsp;|&nbsp; 🎨 简洁美观
          </div>
        </div>
      </div>

      {/* 右侧 - 快速开始 + 最新功能 */}
      <div className="w-96 p-8 flex flex-col gap-6 overflow-y-auto relative z-10">
        {/* 快速开始 */}
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 delay-100">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-red-500">⚡</span>
            快速开始
          </h2>
          <div className="space-y-3">
            {quickStartItems.length > 0 ? (
              quickStartItems.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className="w-full flex items-center gap-3 p-3 cursor-pointer rounded-lg bg-neutral-800/50 hover:bg-neutral-800 transition-all group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500/20 to-red-700/20 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-white font-medium">{item.label}</div>
                    <div className="text-xs text-neutral-500">点击打开</div>
                  </div>
                  <span className="text-neutral-600 group-hover:text-red-500 transition-colors">
                    →
                  </span>
                </button>
              ))
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <p>暂无模块</p>
                <p className="text-sm mt-2">请先在模块配置中导入</p>
              </div>
            )}
          </div>
        </div>

        {/* 最新功能 */}
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 delay-200">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-red-500">✨</span>
            最新功能
          </h2>
          <div className="space-y-3">
            {startPage_latestFeatures.map((feature) => (
              <button
                key={feature.id}
                onClick={() => handleNavigate(feature.id)}
                className="w-full flex cursor-pointer items-center gap-3 p-3 rounded-lg bg-neutral-800/30 hover:bg-neutral-800/50 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-neutral-700/50 flex items-center justify-center text-xl">
                  {feature.icon}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-white font-medium">{feature.label}</div>
                  <div className="text-xs text-neutral-500">{feature.date}</div>
                </div>
                <span className="text-neutral-600 group-hover:text-red-500 transition-colors">
                  →
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 底部提示 */}
        <div className="text-center text-neutral-600 text-xs pt-4">
          更多功能敬请期待~
        </div>
      </div>

      {/* 添加动画样式 */}
      <style>{`
        @keyframes scan-top {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          50% {
            transform: translateX(0);
            opacity: 1;
          }
          100% {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        
        @keyframes scan-right {
          0% {
            transform: translateY(-100%);
            opacity: 0;
          }
          50% {
            transform: translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateY(100%);
            opacity: 0;
          }
        }
        
        @keyframes scan-bottom {
          0% {
            transform: translateX(100%);
            opacity: 0;
          }
          50% {
            transform: translateX(0);
            opacity: 1;
          }
          100% {
            transform: translateX(-100%);
            opacity: 0;
          }
        }
        
        @keyframes scan-left {
          0% {
            transform: translateY(100%);
            opacity: 0;
          }
          50% {
            transform: translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateY(-100%);
            opacity: 0;
          }
        }
        
        @keyframes pulse-glow {
          0%, 100% {
            opacity: 0.3;
            box-shadow: 0 0 0px rgba(239, 68, 68, 0);
          }
          50% {
            opacity: 1;
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.8);
          }
        }
        
        @keyframes logo-pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        
        .animate-scan-top {
          animation: scan-top 1.25s ease-in-out infinite;
        }
        
        .animate-scan-right {
          animation: scan-right 1.25s ease-in-out infinite;
        }
        
        .animate-scan-bottom {
          animation: scan-bottom 1.25s ease-in-out infinite;
        }
        
        .animate-scan-left {
          animation: scan-left 1.25s ease-in-out infinite;
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 1.25s ease-in-out infinite;
        }
        
        .animate-logo-pulse {
          animation: logo-pulse 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default StartPage;