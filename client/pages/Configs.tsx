import React, { useEffect, useState } from 'react';
import sidebarItems from '../config/sidebar.config';
import { labelSourceConfig } from '../config/module.config';
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

const allAvailableItems: SidebarItem[] = sidebarItems;

const SidebarModuleManager: React.FC = () => {
  const {
    sidebarItems: localItems,
    loading,
    loadItems,
    addItem,
    deleteItem,
  } = useModuleStore();

  // 排序后的列表（按 order 升序）
  const [sortedItems, setSortedItems] = useState<SidebarItem[]>([]);

  // 同步 store 数据到本地排序列表
  useEffect(() => {
    const sorted = [...localItems].sort((a, b) => a.order - b.order);
    setSortedItems(sorted);
  }, [localItems]);

  useEffect(() => {
    loadItems();
  }, []);

  const isItemImported = (id: string) =>
    localItems.some((item) => item.id === id);

  const handleImport = async (item: SidebarItem) => {
    await addItem(item);
  };

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
        {/* 本地配置列表（一排四个网格） */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-neutral-200 mb-3">
            当前本地配置
            <span className="ml-2 text-sm font-normal text-neutral-400">
              ({sortedItems.length} 个模块)
            </span>
          </h2>

          <div className=" rounded-lg border border-red-500/20 p-3 backdrop-blur-sm">
            {sortedItems.length === 0 ? (
              <div className="p-8 text-center text-neutral-500">
                暂无配置，请从下方模块库导入
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {sortedItems.map((item) => (
                  <div
                    key={item.id}
                    className="relative bg-red-950/70 border border-red-800/40 rounded-lg p-3 hover:bg-red-950/80 transition-colors"
                    style={{ overflow: 'visible' }} // 让装饰图标可以突破边框
                  >
                    {/* 背景装饰：放大图标，低透明度，放在左边居中 */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none select-none">
                      <span className="text-7xl">{item.icon || '📦'}</span>
                    </div>

                    {/* 前置内容（相对定位确保在装饰之上） */}
                    <div className="relative z-10 flex items-center gap-3">
                      {/* 正常大小图标 */}
                      <div className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-red-500/20 to-red-700/20 rounded-lg text-xl flex-shrink-0">
                        {item.icon || '📦'}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* 文字放大 */}
                        <div className="font-semibold text-neutral-200 text-base truncate">
                          {item.label}
                        </div>
                      </div>
                    </div>

                    {/* 删除按钮（－）右上角 */}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="absolute top-1 right-1 z-20 p-1 text-red-400 cursor-pointer bg-red-500/10 hover:text-red-300 rounded transition-colors text-xs leading-none"
                      title="删除此模块"
                    >
                      －
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 可用模块库（一排四个） */}
        <div>
          <h2 className="text-lg font-semibold text-neutral-200 mb-3">
            可用模块库
            <span className="ml-2 text-sm font-normal text-neutral-400">
              ({allAvailableItems.length} 个可用)
            </span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {allAvailableItems.map((item) => {
              const imported = isItemImported(item.id);

              return (
                <div
                  key={item.id}
                  className={`relative overflow-hidden bg-neutral-900/80 rounded-lg border p-4 flex flex-col items-center justify-between transition-all backdrop-blur-sm ${
                    imported
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-red-500/20 hover:border-red-500/40 hover:bg-red-500/5'
                  }`}
                >
                  {/* 背景装饰图标 */}
                  <div className="absolute -right-4 -bottom-4 opacity-5 transform rotate-12 pointer-events-none">
                    <span className="text-9xl">{item.icon || '📦'}</span>
                  </div>

                  {/* 图标 */}
                  <div className="relative z-10 w-12 h-12 flex items-center justify-center mb-2 text-2xl bg-gradient-to-br from-red-500/20 to-red-700/20 rounded-xl">
                    {item.icon || '📦'}
                  </div>

                  {/* 标签与来源 */}
                  <div className="relative z-10 text-center">
                    <div className="font-medium text-neutral-200 text-sm mb-1">
                      {item.label}
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded`}
                    >
                      {labelSourceConfig[item.source]?.label || item.source}
                    </span>
                  </div>

                  {/* 导入按钮 */}
                  <button
                    onClick={() => !imported && handleImport(item)}
                    disabled={imported}
                    className={`relative z-10 mt-3 px-3 py-1.5 text-sm rounded transition-all w-full ${
                      imported
                        ? 'bg-green-500/20 text-green-400 cursor-default'
                        : 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-500/25'
                    }`}
                  >
                    {imported ? (
                      <span className="flex items-center justify-center gap-1">
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
