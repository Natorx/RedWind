import iconSrc from '../assets/icon.png';
import { startPage_latestFeatures } from '../config/startItem.config';
import { useActiveItem } from '../context/activeItemContext';
import { useModuleStore } from '../stores/moduleItemsStore';

const StartPage: React.FC = () => {
  const { sidebarItems } = useModuleStore();
  const { setActiveItem } = useActiveItem();

  // 快速开始：前3个已导入的模块
  const quickStartItems = sidebarItems.slice(0, 3);

  const handleNavigate = (id: string) => {
    setActiveItem(id);
  };

  return (
    <div className="flex h-full min-h-screen bg-gradient-to-br from-red-950 to-neutral-900 relative overflow-hidden">
      {/* 左侧 - Logo 和信息 */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center animate-in fade-in slide-in-from-left-4 duration-500">
          {/* Logo */}
          <div className="mb-6 inline-block">
            <div className="w-28 h-28 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 p-0.5 shadow-lg animate-in zoom-in duration-300">
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
                  <span className="text-neutral-600 group-hover:text-red-500 transition-colors">→</span>
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
                <span className="text-neutral-600 group-hover:text-red-500 transition-colors">→</span>
              </button>
            ))}
          </div>
        </div>

        {/* 底部提示 */}
        <div className="text-center text-neutral-600 text-xs pt-4">
          更多功能敬请期待~
        </div>
      </div>
    </div>
  );
};

export default StartPage;