import React, { useEffect, useState } from 'react';
import sidebarItems from '../config/sidebar.config';
import { labelSourceConfig } from '../styles/sidebar_style';
import { useModuleStore } from '../stores/moduleItemsStore';

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  order: number;
  source: 'server' | 'local' | 'coming_soon' | 'incomplete' | 'external' | 'basic' | 'others';
}

const allAvailableItems: SidebarItem[] = sidebarItems;

const SidebarModuleManager: React.FC = () => {
  const {
    sidebarItems: localItems,
    loading,
    loadItems,
    addItem,
    deleteItem,
    updateOrder,
  } = useModuleStore();

  // 本地排序后的列表，用于拖拽展示（每次 localItems 变化后重新排序）
  const [sortedItems, setSortedItems] = useState<SidebarItem[]>([]);

  // 拖拽状态
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  // 同步 store 数据到本地排序列表
  useEffect(() => {
    const sorted = [...localItems].sort((a, b) => a.order - b.order);
    setSortedItems(sorted);
  }, [localItems]);

  useEffect(() => {
    loadItems();
  }, []);

  const isItemImported = (id: string) => {
    return localItems.some((item) => item.id === id);
  };

  const handleImport = async (item: SidebarItem) => {
    await addItem(item);
  };

  const handleDelete = async (id: string) => {
    await deleteItem(id);
  };

  // 拖拽开始
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragItemId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  // 拖拽经过
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverItemId(id);
    e.dataTransfer.dropEffect = 'move';
  };

  // 拖拽结束（清理状态）
  const handleDragEnd = () => {
    setDragItemId(null);
    setDragOverItemId(null);
  };

  // 执行拖拽放置
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverItemId(null);

    if (!dragItemId || dragItemId === targetId) return;

    const dragIndex = sortedItems.findIndex((item) => item.id === dragItemId);
    const targetIndex = sortedItems.findIndex((item) => item.id === targetId);
    if (dragIndex === -1 || targetIndex === -1) return;

    // 重新排列数组
    const newItems = [...sortedItems];
    const [removed] = newItems.splice(dragIndex, 1);
    newItems.splice(targetIndex, 0, removed);

    // 为每个项分配新的顺序
    const reordered: [string, number][] = newItems.map((item, idx) => [item.id, idx]);

    // 立即更新本地状态以提供流畅的拖拽反馈
    const updatedItems = newItems.map((item, idx) => ({ ...item, order: idx }));
    setSortedItems(updatedItems);

    // 持久化到后端
    updateOrder(reordered);

    setDragItemId(null);
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
        {/* 本地配置列表 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-neutral-200">
              当前本地配置
              <span className="ml-2 text-sm font-normal text-neutral-400">
                ({sortedItems.length} 个模块)
              </span>
            </h2>
          </div>

          <div className="bg-neutral-900/80 rounded-lg border border-red-500/20 overflow-hidden backdrop-blur-sm">
            {sortedItems.length === 0 ? (
              <div className="p-8 text-center text-neutral-500">
                暂无配置，请从下方模块库导入
              </div>
            ) : (
              <div className="divide-y divide-red-500/10">
                {sortedItems.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onDragOver={(e) => handleDragOver(e, item.id)}
                    onDrop={(e) => handleDrop(e, item.id)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center p-4 transition-colors ${
                      dragItemId === item.id
                        ? 'opacity-50 bg-red-500/10'
                        : dragOverItemId === item.id
                        ? 'bg-red-500/20 border-t-2 border-red-400'
                        : 'hover:bg-red-500/5'
                    } cursor-default`}
                  >
                    {/* 拖拽手柄 */}
                    <div className="mr-3 text-neutral-500 cursor-grab active:cursor-grabbing select-none">
                      ⋮⋮
                    </div>

                    {/* 图标 */}
                    <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-red-500/20 to-red-700/20 rounded-lg mr-3 text-xl">
                      {item.icon || '📦'}
                    </div>

                    {/* 模块信息 */}
                    <div className="flex-1">
                      <div className="font-medium text-neutral-200">{item.label}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-neutral-400">ID: {item.id}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            labelSourceConfig[item.source]?.className || labelSourceConfig.others.className
                          }`}
                        >
                          {labelSourceConfig[item.source]?.label || item.source}
                        </span>
                        <span className="text-xs text-neutral-500">顺序: {item.order}</span>
                      </div>
                    </div>

                    {/* 删除按钮 */}
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

        {/* 可用模块库 */}
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
                    <div className="w-10 h-10 flex items-center justify-center mr-3 text-xl bg-gradient-to-br from-red-500/20 to-red-700/20 rounded-lg">
                      {item.icon || '📦'}
                    </div>
                    <div>
                      <div className="font-medium text-neutral-200">{item.label}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-neutral-400">{item.id}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            labelSourceConfig[item.source]?.className || labelSourceConfig.others.className
                          }`}
                        >
                          {labelSourceConfig[item.source]?.label || item.source}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => !imported && handleImport(item)}
                    disabled={imported}
                    className={`relative z-10 px-3 py-1.5 text-sm rounded transition-all ${
                      imported
                        ? 'bg-green-500/20 text-green-400 cursor-default'
                        : 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-500/25'
                    }`}
                  >
                    {imported ? (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
