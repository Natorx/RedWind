import { useState } from 'react';
import PageBox from '../components/PageBox';
import useAppStore from '../stores/app';
import { useMsg } from '../components/Msg';

// 订阅条目类型（仅用于用户自定义项）
interface Subscription {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

const Subscribe: React.FC = () => {
  // 从全局 store 获取 serverpush 状态及 setter
  const serverpush = useAppStore((s) => s.serverpush);
  const setServerpush = useAppStore((s) => s.setServerpush);
  const { showMsg } = useMsg();

  // 表单状态
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [newEnabled, setNewEnabled] = useState(true);

  // 本地订阅列表（不含服务推送）
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  // 添加订阅
  const handleAdd = () => {
    if (!name.trim() || !description.trim()) return;
    const newItem: Subscription = {
      id: Date.now().toString(),
      name: name.trim(),
      description: description.trim(),
      enabled: newEnabled,
    };
    setSubscriptions([...subscriptions, newItem]);
    setName('');
    setDescription('');
    setNewEnabled(true);
  };

  // 切换用户自定义项的启用状态
  const handleToggle = (id: string) => {
    setSubscriptions(
      subscriptions.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled } : s,
      ),
    );
  };

  return (
    <PageBox>
      <div className="flex flex-col justify-center items-start w-full p-6 relative">
        {/* 背景动画装饰线（与 StartPage 风格匹配） */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-scan-top"></div>
          <div className="absolute top-0 right-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-red-500 to-transparent animate-scan-right"></div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-scan-bottom"></div>
          <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-red-500 to-transparent animate-scan-left"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-red-500/60 rounded-tl-lg animate-pulse-glow"></div>
          <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-red-500/60 rounded-tr-lg animate-pulse-glow"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-red-500/60 rounded-bl-lg animate-pulse-glow"></div>
          <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-red-500/60 rounded-br-lg animate-pulse-glow"></div>
        </div>

        {/* 添加表单区域 */}
        <div className="w-full z-10 bg-neutral-800/40 backdrop-blur-sm rounded-xl p-5 mb-6 border border-neutral-700/50 shadow-lg">
          <h3 className="text-sm font-semibold text-neutral-300 mb-4 tracking-wider uppercase">
            添加新订阅
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">
                订阅名称
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：科技早报"
                className="w-full px-3 py-2 bg-neutral-900/70 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">
                订阅 URL
              </label>
              <input
                type="url"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="https://example.com/feed.xml"
                className="w-full px-3 py-2 bg-neutral-900/70 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition"
              />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <label className="text-neutral-300 text-sm">启用</label>
              <button
                onClick={() => setNewEnabled(!newEnabled)}
                className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                  newEnabled ? 'bg-red-600' : 'bg-neutral-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                    newEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <button
              onClick={handleAdd}
              className="px-5 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium rounded-lg shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              添加订阅
            </button>
          </div>
        </div>

        {/* 订阅列表表格 */}
        <div className="w-full z-10 bg-neutral-800/30 rounded-xl overflow-hidden border border-neutral-700/40 shadow-lg">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-800/70 border-b border-neutral-700 text-neutral-400 text-sm uppercase tracking-wider">
                <th className="px-4 py-3">名称</th>
                <th className="px-4 py-3">描述</th>
                <th className="px-4 py-3 text-center">状态</th>
              </tr>
            </thead>
            <tbody>
              {/* 固定行：服务推送（直接绑定全局 store） */}
              <tr className="border-b border-neutral-700/30 hover:bg-neutral-700/20 transition">
                <td className="px-4 py-3 text-white font-medium">服务推送</td>
                <td className="px-4 py-3 text-neutral-300 text-sm truncate max-w-xs">
                  开启后在启动时会主动连接服务器，接受服务端的推送
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => {
                      const newVal = !serverpush;
                      setServerpush(newVal);
                      if (newVal) {
                        showMsg('服务器推送已开启', 'success', 3000, 500);
                      } else {
                        showMsg('服务器推送已关闭', 'info', 3000);
                      }
                    }}
                    className={`relative cursor-pointer inline-block w-9 h-4 rounded-full transition-colors duration-200 ${
                      serverpush ? 'bg-red-500' : 'bg-neutral-500'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-200 ${
                        serverpush ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </td>
              </tr>

              {/* 用户自定义订阅项 */}
              {subscriptions.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-neutral-500"
                  >
                    暂无其他订阅，请添加
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr
                    key={sub.id}
                    className="border-b border-neutral-700/30 hover:bg-neutral-700/20 transition"
                  >
                    <td className="px-4 py-3 text-white font-medium">
                      {sub.name}
                    </td>
                    <td className="px-4 py-3 text-neutral-300 text-sm truncate max-w-xs">
                      {sub.description}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(sub.id)}
                        className={`relative cursor-pointer inline-block w-9 h-4 rounded-full transition-colors duration-200 ${
                          sub.enabled ? 'bg-red-500' : 'bg-neutral-500'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-200 ${
                            sub.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 底部统计 */}
        <div className="mt-4 text-xs text-neutral-500 z-10">
          共 {subscriptions.length + 1} 条订阅（含服务推送）
        </div>
      </div>
    </PageBox>
  );
};

export default Subscribe;
