import { invoke } from '@tauri-apps/api/core';
import React, { useState, useEffect } from 'react';
import sidebarItems from '../config/sidebar.config';

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  order: number;
  source: 'local' | 'server' | 'others';
}

// 所有可用模块
const allAvailableItems: SidebarItem[] = sidebarItems;

const SidebarModuleManager: React.FC = () => {
  const [localItems, setLocalItems] = useState<SidebarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // 加载本地配置
  const loadLocalItems = async () => {
    try {
      const items = await invoke<SidebarItem[]>('get_sidebar_items');
      setLocalItems(items);
    } catch (error) {
      console.error('加载本地配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocalItems();
  }, []);

  // 检查模块是否已导入
  const isItemImported = (id: string) => {
    return localItems.some((item) => item.id === id);
  };

  // 导入模块
  const handleImport = async (item: SidebarItem) => {
    try {
      const maxOrder = Math.max(...localItems.map((i) => i.order), -1);
      await invoke('add_sidebar_item', {
        id: item.id,
        label: item.label,
        icon: item.icon,
        order: maxOrder + 1,
        source: item.source,
      });
      await loadLocalItems();
    } catch (error) {
      console.error('导入模块失败:', error);
    }
  };

  // 删除模块
  const handleDelete = async (id: string) => {
    try {
      await invoke('delete_sidebar_item', { id });
      await loadLocalItems();
    } catch (error) {
      console.error('删除模块失败:', error);
    }
  };

  // 拖拽处理
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...localItems];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);

    // 更新顺序
    newItems.forEach((item, idx) => {
      item.order = idx;
    });

    setLocalItems(newItems);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex !== null) {
      try {
        const orderUpdates = localItems.map(
          (item) => [item.id, item.order] as [string, number],
        );
        await invoke('update_sidebar_items_order', { items: orderUpdates });
        await loadLocalItems();
      } catch (error) {
        console.error('更新顺序失败:', error);
      }
    }
    setDraggedIndex(null);
  };

  // 更新模块信息
  const handleUpdateItem = async (
    id: string,
    field: keyof SidebarItem,
    value: string,
  ) => {
    try {
      await invoke('update_sidebar_item', {
        id,
        [field]: value,
      });
      await loadLocalItems();
    } catch (error) {
      console.error('更新模块失败:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">侧边栏模块管理</h1>

      {/* 本地配置列表 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-700">
            当前本地配置
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({localItems.length} 个模块)
            </span>
          </h2>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {localItems.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              暂无配置，请从下方模块库导入
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {localItems
                .sort((a, b) => a.order - b.order)
                .map((item, index) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center p-4 hover:bg-gray-50 transition-colors cursor-move ${
                      draggedIndex === index ? 'opacity-50' : ''
                    }`}
                  >
                    {/* 拖拽手柄 */}
                    <div className="mr-3 text-gray-400 cursor-grab active:cursor-grabbing">
                      ⋮⋮
                    </div>

                    {/* 图标 */}
                    <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg mr-3 text-xl">
                      {item.icon || '📦'}
                    </div>

                    {/* 模块信息 */}
                    <div className="flex-1">
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) =>
                          handleUpdateItem(item.id, 'label', e.target.value)
                        }
                        className="font-medium text-gray-800 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded px-2 py-1 outline-none transition-colors"
                      />
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">
                          ID: {item.id}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            item.source === 'local'
                              ? 'bg-green-100 text-green-700'
                              : item.source === 'server'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {item.source}
                        </span>
                        <span className="text-xs text-gray-400">
                          顺序: {item.order}
                        </span>
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
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
        <h2 className="text-lg font-semibold text-gray-700 mb-3">
          可用模块库
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({allAvailableItems.length} 个可用)
          </span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {allAvailableItems.map((item) => {
            const imported = isItemImported(item.id);

            return (
              <div
                key={item.id}
                className={`bg-white rounded-lg border p-4 flex items-center justify-between transition-all ${
                  imported
                    ? 'border-green-200 bg-green-50/50'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg mr-3 text-xl">
                    {item.icon || '📦'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">
                      {item.label}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{item.id}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          item.source === 'local'
                            ? 'bg-green-100 text-green-700'
                            : item.source === 'server'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {item.source}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() =>
                    !imported &&
                    handleImport(item).then(() => {
                      loadLocalItems();
                    })
                  }
                  disabled={imported}
                  className={`px-3 py-1.5 text-sm rounded transition-all ${
                    imported
                      ? 'bg-green-100 text-green-700 cursor-default'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
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
  );
};

export default SidebarModuleManager;
