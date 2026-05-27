// pages/Personalization.tsx
import React, { useState } from 'react';
import PageBox from '../components/PageBox';
import { StatItem, useStatsStore } from '../stores/dashboard';
import { Plus, Trash2, Save, RefreshCw, Edit2, X } from 'lucide-react';

const Personalization: React.FC = () => {
  const { stats, updateStats, updateModuleCount, refreshStats } = useStatsStore();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<StatItem>>({});

  // 颜色选项
  const colorOptions = [
    'bg-gradient-to-br from-blue-500 to-blue-600',
    'bg-gradient-to-br from-green-500 to-green-600',
    'bg-gradient-to-br from-purple-500 to-purple-600',
    'bg-gradient-to-br from-orange-500 to-orange-600',
    'bg-gradient-to-br from-red-500 to-red-600',
    'bg-gradient-to-br from-pink-500 to-pink-600',
    'bg-gradient-to-br from-indigo-500 to-indigo-600',
    'bg-gradient-to-br from-teal-500 to-teal-600',
  ];

  // 图标选项
  const iconOptions = ['Activity', 'Users', 'ShoppingCart'];

  // 处理编辑
  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm(stats[index]);
  };

  // 处理保存编辑
  const handleSaveEdit = () => {
    if (editingIndex !== null && editForm) {
      const updatedStats = [...stats];
      updatedStats[editingIndex] = { ...stats[editingIndex], ...editForm } as StatItem;
      updateStats(updatedStats);
      setEditingIndex(null);
      setEditForm({});
    }
  };

  // 处理取消编辑
  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditForm({});
  };

  // 添加新卡片
  const handleAddCard = () => {
    const newCard: StatItem = {
      title: '新指标',
      value: '0',
      icon: 'Activity',
      trend: 'up',
      trendValue: '+0%',
      color: 'bg-gradient-to-br from-gray-500 to-gray-600',
    };
    updateStats([...stats, newCard]);
  };

  // 删除卡片
  const handleDeleteCard = (index: number) => {
    if (window.confirm('确定要删除这个统计卡片吗？')) {
      const updatedStats = stats.filter((_, i) => i !== index);
      updateStats(updatedStats);
    }
  };

  // 移动卡片位置
  const handleMoveCard = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= stats.length) return;
    
    const updatedStats = [...stats];
    [updatedStats[index], updatedStats[newIndex]] = [updatedStats[newIndex], updatedStats[index]];
    updateStats(updatedStats);
  };

  // 表单输入变化
  const handleInputChange = (field: keyof StatItem, value: string | number) => {
    setEditForm({ ...editForm, [field]: value });
  };

  return (
    <PageBox>
      <div className="space-y-6">
        {/* 页面标题和操作栏 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-neutral-100">个性化配置</h1>
            <p className="text-neutral-400 mt-1">自定义统计卡片的数据和样式</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={updateModuleCount}
              className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              同步模块数量
            </button>
            <button
              onClick={refreshStats}
              className="px-4 py-2 bg-neutral-700 text-neutral-300 rounded-lg hover:bg-neutral-600 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              重置默认
            </button>
            <button
              onClick={handleAddCard}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              添加卡片
            </button>
          </div>
        </div>

        {/* 统计卡片列表 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-200">统计卡片配置</h2>
          
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-neutral-900/60 rounded-xl border border-neutral-800 p-4 hover:border-red-500/30 transition-all"
            >
              {editingIndex === index ? (
                // 编辑模式
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-2">标题</label>
                      <input
                        type="text"
                        value={editForm.title || ''}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-2">数值</label>
                      <input
                        type="text"
                        value={editForm.value || ''}
                        onChange={(e) => handleInputChange('value', e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-2">图标</label>
                      <select
                        value={editForm.icon || 'Activity'}
                        onChange={(e) => handleInputChange('icon', e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:border-red-500"
                      >
                        {iconOptions.map(icon => (
                          <option key={icon} value={icon}>{icon}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-2">趋势</label>
                      <select
                        value={editForm.trend || 'up'}
                        onChange={(e) => handleInputChange('trend', e.target.value as 'up' | 'down')}
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:border-red-500"
                      >
                        <option value="up">上升 📈</option>
                        <option value="down">下降 📉</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-2">趋势值</label>
                      <input
                        type="text"
                        value={editForm.trendValue || ''}
                        onChange={(e) => handleInputChange('trendValue', e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-2">颜色</label>
                      <div className="grid grid-cols-4 gap-2">
                        {colorOptions.map(color => (
                          <button
                            key={color}
                            onClick={() => handleInputChange('color', color)}
                            className={`h-10 rounded-lg ${color} ${editForm.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900' : ''}`}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 bg-neutral-700 text-neutral-300 rounded-lg hover:bg-neutral-600 transition-colors flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      取消
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                // 查看模式
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-2 rounded-lg ${stat.color}`}>
                      <div className="w-8 h-8" /> {/* 图标占位 */}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-neutral-100">{stat.title}</h3>
                        <span className="text-2xl font-bold text-neutral-100">{stat.value}</span>
                        {stat.trend && (
                          <span className={`text-sm ${stat.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                            {stat.trendValue}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-neutral-500 mt-1">图标: {stat.icon} | 颜色: {stat.color.split(' ').slice(0, 2).join(' ')}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMoveCard(index, 'up')}
                      disabled={index === 0}
                      className="p-2 text-neutral-400 hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleMoveCard(index, 'down')}
                      disabled={index === stats.length - 1}
                      className="p-2 text-neutral-400 hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => handleEdit(index)}
                      className="p-2 text-blue-400 hover:text-blue-300"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCard(index)}
                      className="p-2 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {stats.length === 0 && (
            <div className="text-center py-12 bg-neutral-900/40 rounded-xl border border-dashed border-neutral-700">
              <p className="text-neutral-500">暂无统计卡片，点击"添加卡片"开始配置</p>
            </div>
          )}
        </div>

        {/* 实时预览 */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-neutral-200 mb-4">实时预览</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <div key={`preview-${index}`} className="bg-neutral-900/80 rounded-xl shadow-lg p-6 border border-red-500/20">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-neutral-400 mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-neutral-100">{stat.value}</p>
                    {stat.trend && (
                      <div className="flex items-center mt-2">
                        <span className={`text-xs font-medium ${stat.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                          {stat.trendValue}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <div className="w-6 h-6" /> {/* 图标占位 */}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageBox>
  );
};

export default Personalization;