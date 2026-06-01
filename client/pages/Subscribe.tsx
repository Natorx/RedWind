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

  // 本地订阅列表（不含服务推送）
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

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
