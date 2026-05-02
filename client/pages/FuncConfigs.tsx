import React, { useEffect } from 'react';
import sidebarItems from '../config/sidebar.config';
import { labelSourceConfig } from '../config/sidebar_style';
import { useModuleStore } from '../stores/moduleItemsStore';

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  order: number;
  source:
    | 'server'
    | 'local'
    | 'coming_soon'
    | 'incomplete'
    | 'external'
    | 'basic'
    | 'others';
}

// 所有可用模块
const allAvailableItems: SidebarItem[] = sidebarItems;

const SidebarModuleManager: React.FC = () => {
  const {
    sidebarItems: localItems,
    loading,
    loadItems,
    addItem,
    deleteItem,
  } = useModuleStore();

  useEffect(() => {
    loadItems();
  }, []);

  // 检查模块是否已导入
  const isItemImported = (id: string) => {
    return localItems.some((item) => item.id === id);
  };

  // 导入模块
  const handleImport = async (item: SidebarItem) => {
    await addItem(item);
  };

  // 删除模块
  const handleDelete = async (id: string) => {
    await deleteItem(id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 to-neutral-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
          侧边栏模块管理
        </h1>

        {/* 本地配置列表 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-neutral-200">
              当前本地配置
              <span className="ml-2 text-sm font-normal text-neutral-400">
                ({localItems.length} 个模块)
              </span>
            </h2>
          </div>

          <div className="bg-neutral-900/80 rounded-lg border border-red-500/20 overflow-hidden backdrop-blur-sm">
            {localItems.length === 0 ? (
              <div className="p-8 text-center text-neutral-500">
                暂无配置，请从下方模块库导入
              </div>
            ) : (
              <div className="divide-y divide-red-500/10">
                {localItems
                  .sort((a, b) => a.order - b.order)
                  .map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center p-4 hover:bg-red-500/5 transition-colors cursor-move`}
                    >
                      {/* 拖拽手柄 */}
                      <div className="mr-3 text-neutral-500 cursor-grab active:cursor-grabbing">
                        ⋮⋮
                      </div>

                      {/* 图标 */}
                      <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-red-500/20 to-red-700/20 rounded-lg mr-3 text-xl">
                        {item.icon || '📦'}
                      </div>

                      {/* 模块信息 */}
                      <div className="flex-1">
                        <input
                          type="text"
                          value={item.label}
                          className="font-medium text-neutral-200 bg-transparent border border-transparent hover:border-red-500/30 focus:border-red-500 rounded px-2 py-1 outline-none transition-colors"
                        />
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-neutral-400">
                            ID: {item.id}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${labelSourceConfig[item.source]?.className || labelSourceConfig.others.className}`}
                          >
                            {labelSourceConfig[item.source]?.label || item.source}
                          </span>
                          <span className="text-xs text-neutral-500">
                            顺序: {item.order}
                          </span>
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* 所有可用模块 */}
        <div>
          <h2 className="text-lg font-semibold text-neutral-200 mb-3">
            可用模块库
            <span className="ml-2 text-sm font-normal text-neutral-400">
              ({allAvailableItems.length} 个可用)
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allAvailableItems.map((item) => {
              const imported = isItemImported(item.id);

              return (
                <div
                  key={item.id}
                  className={`relative overflow-hidden bg-neutral-900/80 rounded-lg border p-4 flex items-center justify-between transition-all backdrop-blur-sm ${
                    imported
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-red-500/20 hover:border-red-500/40 hover:bg-red-500/5'
                  }`}
                >
                  {/* 背景装饰图标 */}
                  <div className="absolute -right-4 -bottom-4 opacity-5 transform rotate-12 pointer-events-none">
                    <span className="text-9xl">{item.icon || '📦'}</span>
                  </div>

                  <div className="relative z-10 flex items-center flex-1">
                    {/* 图标 */}
                    <div className="w-10 h-10 flex items-center justify-center mr-3 text-xl bg-gradient-to-br from-red-500/20 to-red-700/20 rounded-lg">
                      {item.icon || '📦'}
                    </div>
                    <div>
                      <div className="font-medium text-neutral-200">
                        {item.label}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-neutral-400">{item.id}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            labelSourceConfig[item.source]?.className ||
                            labelSourceConfig.others.className
                          }`}
                        >
                          {labelSourceConfig[item.source]?.label || item.source}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      !imported &&
                      handleImport(item).then(() => {
                        loadItems();
                      })
                    }
                    disabled={imported}
                    className={`relative z-10 px-3 py-1.5 text-sm rounded transition-all ${
                      imported
                        ? 'bg-green-500/20 text-green-400 cursor-default'
                        : 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-500/25'
                    }`}
                  >
                    {imported ? (
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        已导入
                      </span>
                    ) : (
                      '导入'
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidebarModuleManager;