import iconSrc from '../assets/icon.png';

const StartPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-screen bg-gradient-to-br from-red-950 to-neutral-900">
      <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Logo */}
        <div className="mb-6 inline-block">
          <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 p-0.5 shadow-lg animate-in zoom-in duration-300">
            <div className="w-full h-full rounded-2xl bg-neutral-900 flex items-center justify-center overflow-hidden">
              <img 
                src={iconSrc} 
                alt="Red Wind" 
                className="w-16 h-16 object-contain"
              />
            </div>
          </div>
        </div>

        <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent mb-3">
          Red Wind
        </h1>
        
        <p className="text-neutral-400 text-lg mb-8">
          开启你的高效之旅
        </p>

        <div className="w-16 h-1 bg-gradient-to-r from-red-500 to-red-700 rounded-full mx-auto mb-8"></div>

        <div className="flex flex-col gap-3 text-neutral-500">
          <div className="flex items-center gap-2 justify-center">
            <span className="text-red-500">🎯</span>
            <span className="text-neutral-300">从左侧菜单选择功能模块</span>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <span className="text-red-500">⚡</span>
            <span className="text-neutral-300">快速访问常用工具</span>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <span className="text-red-500">🎨</span>
            <span className="text-neutral-300">享受简洁的界面体验</span>
          </div>
        </div>

        <div className="absolute bottom-6 left-0 right-0 text-center text-neutral-600 text-xs">
          © 2024 Red Wind · 让工作更简单
        </div>
      </div>
    </div>
  );
};

export default StartPage;