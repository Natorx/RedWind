// components/BarChart.tsx
import React, { useState, useMemo } from 'react';
import ChartContainer from './ChartContainer';

interface BarChartData {
  category: string;
  values: {
    label: string;
    value: number;
    color: string;
  }[];
}

interface BarChartProps {
  data: BarChartData[];
  title: string;
  yAxisLabel?: string;
  showGrid?: boolean;
  barWidth?: number;
  barSpacing?: number;
  groupSpacing?: number;
  onDataChange?: (data: BarChartData[]) => void;
}

const BarChart: React.FC<BarChartProps> = ({
  data: initialData,
  title,
  yAxisLabel = '数值',
  showGrid = true,
  barWidth = 40,
  barSpacing = 8,
  groupSpacing = 20,
  onDataChange
}) => {
  const [data, setData] = useState<BarChartData[]>(initialData);
  const [hoveredBar, setHoveredBar] = useState<{category: string; label: string} | null>(null);
  const [selectedBar, setSelectedBar] = useState<{category: string; label: string} | null>(null);
  const [_, setEditValue] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'category' | 'value'>('category');
  const [filterMin, setFilterMin] = useState<number>(0);
  const [showPercentage, setShowPercentage] = useState<boolean>(false);
  
  // 计算最大值用于缩放
  const allValues = data.flatMap(d => d.values.map(v => v.value));
  const maxValue = Math.max(...allValues);
  const totalValue = allValues.reduce((sum, v) => sum + v, 0);
  
  const barGroups = data[0]?.values.length || 1;
  
  // 图表尺寸
  const chartHeight = 320;
  const chartPadding = { top: 40, right: 40, bottom: 60, left: 60 };
  
  // 筛选和排序后的数据
  const filteredAndSortedData = useMemo(() => {
    let filtered = data.map(group => ({
      ...group,
      values: group.values.filter(v => v.value >= filterMin)
    })).filter(group => group.values.length > 0);
    
    if (sortBy === 'value') {
      filtered = [...filtered].sort((a, b) => {
        const aTotal = a.values.reduce((sum, v) => sum + v.value, 0);
        const bTotal = b.values.reduce((sum, v) => sum + v.value, 0);
        return bTotal - aTotal;
      });
    }
    
    return filtered;
  }, [data, sortBy, filterMin]);
  
  // 计算Y轴刻度
  const calculateYTicks = () => {
    const ticks = [];
    const tickCount = 5;
    for (let i = 0; i <= tickCount; i++) {
      const value = Math.round((i / tickCount) * maxValue);
      ticks.push(value);
    }
    return ticks;
  };

  const yTicks = calculateYTicks();

  // 更新数值
  const updateBarValue = (category: string, label: string, newValue: number) => {
    const newData = data.map(group => {
      if (group.category === category) {
        return {
          ...group,
          values: group.values.map(v => 
            v.label === label ? { ...v, value: Math.max(0, newValue) } : v
          )
        };
      }
      return group;
    });
    setData(newData);
    if (onDataChange) onDataChange(newData);
  };

  // 获取当前选中柱状图的值
  const getSelectedBarValue = () => {
    if (!selectedBar) return 0;
    const group = data.find(g => g.category === selectedBar.category);
    const bar = group?.values.find(v => v.label === selectedBar.label);
    return bar?.value || 0;
  };

  // 添加新分类
  const addCategory = () => {
    const newCategoryName = prompt('请输入新分类名称:');
    if (!newCategoryName) return;
    
    const newValues = data[0]?.values.map(v => ({
      label: v.label,
      value: 0,
      color: v.color
    })) || [];
    
    setData([...data, { category: newCategoryName, values: newValues }]);
  };

  // 删除分类
  const deleteCategory = (category: string) => {
    if (confirm(`确定要删除分类 "${category}" 吗？`)) {
      const newData = data.filter(g => g.category !== category);
      setData(newData);
      if (selectedBar?.category === category) setSelectedBar(null);
      if (onDataChange) onDataChange(newData);
    }
  };

  // 添加新数据系列
  const addSeries = () => {
    const newSeriesName = prompt('请输入新系列名称:');
    if (!newSeriesName) return;
    
    const newColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
    const newData = data.map(group => ({
      ...group,
      values: [...group.values, { label: newSeriesName, value: 0, color: newColor }]
    }));
    setData(newData);
    if (onDataChange) onDataChange(newData);
  };

  // 删除数据系列
  const deleteSeries = (label: string) => {
    if (confirm(`确定要删除系列 "${label}" 吗？`)) {
      const newData = data.map(group => ({
        ...group,
        values: group.values.filter(v => v.label !== label)
      }));
      setData(newData);
      if (selectedBar?.label === label) setSelectedBar(null);
      if (onDataChange) onDataChange(newData);
    }
  };

  // 重置所有数据
  const resetData = () => {
    setData(initialData.map(group => ({
      ...group,
      values: group.values.map(v => ({ ...v, value: 0 }))
    })));
  };

  // 设置随机数据
  const setRandomData = () => {
    const newData = data.map(group => ({
      ...group,
      values: group.values.map(v => ({ ...v, value: Math.floor(Math.random() * 100) + 1 }))
    }));
    setData(newData);
    if (onDataChange) onDataChange(newData);
  };

  // 归一化（总和为100）
  const normalizeData = () => {
    const newData = data.map(group => {
      const groupTotal = group.values.reduce((sum, v) => sum + v.value, 0);
      if (groupTotal === 0) return group;
      
      return {
        ...group,
        values: group.values.map(v => ({
          ...v,
          value: (v.value / groupTotal) * 100
        }))
      };
    });
    setData(newData);
    if (onDataChange) onDataChange(newData);
  };

  // 导出数据
  const exportData = () => {
    const headers = ['分类', ...data[0]?.values.map(v => v.label) || []];
    const rows = data.map(group => [
      group.category,
      ...group.values.map(v => v.value.toString())
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barchart_data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 获取百分比值
  const getPercentage = (value: number, groupTotal: number) => {
    if (groupTotal === 0) return 0;
    return ((value / groupTotal) * 100).toFixed(1);
  };

  return (
    <ChartContainer title={title}>
      <div className="flex gap-6">
        {/* 左侧控制面板 */}
        <div className="w-80 flex-shrink-0 overflow-y-auto max-h-[600px] pr-4">
          <div className="sticky top-0 bg-white pb-4 mb-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">控制面板</h3>
            <div className="text-xs text-gray-500">
              共 {data.length} 个分类 • {data[0]?.values.length || 0} 个系列
            </div>
          </div>

          {/* 统计信息 */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
            <div className="font-medium text-gray-700 mb-2">统计摘要</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-500">总计</div>
                <div className="font-bold text-gray-800">{totalValue.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-gray-500">平均值</div>
                <div className="font-bold text-gray-800">{(totalValue / allValues.length).toFixed(1)}</div>
              </div>
              <div>
                <div className="text-gray-500">最大值</div>
                <div className="font-bold text-green-600">{maxValue.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-gray-500">最小值</div>
                <div className="font-bold text-orange-600">{Math.min(...allValues).toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* 筛选和排序 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="font-medium text-gray-700 mb-3">筛选与排序</div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">最小数值</label>
                <input
                  type="number"
                  value={filterMin}
                  onChange={(e) => setFilterMin(parseInt(e.target.value) || 0)}
                  className="w-full mt-1 px-2 py-1 text-sm border rounded-md"
                  min="0"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">排序方式</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'category' | 'value')}
                  className="w-full mt-1 px-2 py-1 text-sm border rounded-md"
                >
                  <option value="category">按分类名称</option>
                  <option value="value">按数值大小</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showPercentage"
                  checked={showPercentage}
                  onChange={(e) => setShowPercentage(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="showPercentage" className="text-sm text-gray-600">
                  显示百分比
                </label>
              </div>
            </div>
          </div>

          {/* 选中柱状图编辑 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="font-medium text-gray-700 mb-3">编辑数据</div>
            <select
              className="w-full px-3 py-2 border rounded-md text-sm mb-3"
              value={selectedBar ? `${selectedBar.category}|${selectedBar.label}` : ''}
              onChange={(e) => {
                if (e.target.value) {
                  const [category, label] = e.target.value.split('|');
                  setSelectedBar({ category, label });
                  setEditValue(getSelectedBarValue());
                } else {
                  setSelectedBar(null);
                }
              }}
            >
              <option value="">选择数据点</option>
              {data.map(group => 
                group.values.map(bar => (
                  <option key={`${group.category}|${bar.label}`} value={`${group.category}|${bar.label}`}>
                    {group.category} - {bar.label}
                  </option>
                ))
              )}
            </select>

            {selectedBar && (
              <div>
                <div className="text-sm text-gray-600 mb-2">
                  当前值: <span className="font-bold">{getSelectedBarValue()}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={maxValue}
                  value={getSelectedBarValue()}
                  onChange={(e) => updateBarValue(selectedBar.category, selectedBar.label, parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mb-2"
                  style={{
                    background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${(getSelectedBarValue() / maxValue) * 100}%, #E5E7EB ${(getSelectedBarValue() / maxValue) * 100}%, #E5E7EB 100%)`
                  }}
                />
                <input
                  type="number"
                  value={getSelectedBarValue()}
                  onChange={(e) => updateBarValue(selectedBar.category, selectedBar.label, parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1 text-sm border rounded-md"
                  min="0"
                  step="1"
                />
              </div>
            )}
          </div>

          {/* 批量操作 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="font-medium text-gray-700 mb-3">批量操作</div>
            <div className="space-y-2">
              <button
                onClick={setRandomData}
                className="w-full px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              >
                生成随机数据
              </button>
              <button
                onClick={normalizeData}
                className="w-full px-3 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
              >
                归一化 (总和100)
              </button>
              <button
                onClick={resetData}
                className="w-full px-3 py-2 text-sm bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 transition-colors"
              >
                重置所有数据
              </button>
            </div>
          </div>

          {/* 管理分类和系列 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="font-medium text-gray-700 mb-3">管理分类</div>
            <div className="space-y-2 mb-4">
              <button
                onClick={addCategory}
                className="w-full px-3 py-2 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors"
              >
                + 添加分类
              </button>
              {data.map(group => (
                <div key={group.category} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{group.category}</span>
                  <button
                    onClick={() => deleteCategory(group.category)}
                    className="px-2 py-1 text-xs text-red-500 hover:text-red-700"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
            
            <div className="border-t pt-4">
              <div className="font-medium text-gray-700 mb-3">管理系列</div>
              <button
                onClick={addSeries}
                className="w-full px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors mb-2"
              >
                + 添加系列
              </button>
              {data[0]?.values.map(series => (
                <div key={series.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: series.color }} />
                    <span className="text-sm text-gray-600">{series.label}</span>
                  </div>
                  <button
                    onClick={() => deleteSeries(series.label)}
                    className="px-2 py-1 text-xs text-red-500 hover:text-red-700"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 数据导入导出 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="font-medium text-gray-700 mb-3">数据管理</div>
            <div className="space-y-2">
              <button
                onClick={exportData}
                className="w-full px-3 py-2 text-sm bg-teal-100 text-teal-700 rounded-md hover:bg-teal-200 transition-colors"
              >
                导出数据 (CSV)
              </button>
            </div>
          </div>

          {/* 数据表格 */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="font-medium text-gray-700 mb-3">数据表格</div>
            <div className="max-h-48 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1">分类</th>
                    {data[0]?.values.map(series => (
                      <th key={series.label} className="text-right py-1 px-2">{series.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedData.map(group => {
                    const groupTotal = group.values.reduce((sum, v) => sum + v.value, 0);
                    return (
                      <tr key={group.category} className="border-b border-gray-100">
                        <td className="py-1 font-medium">{group.category}</td>
                        {group.values.map(bar => (
                          <td 
                            key={bar.label} 
                            className="text-right py-1 px-2 cursor-pointer hover:bg-blue-50"
                            onClick={() => {
                              setSelectedBar({ category: group.category, label: bar.label });
                              setEditValue(bar.value);
                            }}
                          >
                            {showPercentage 
                              ? `${getPercentage(bar.value, groupTotal)}%`
                              : bar.value.toLocaleString()}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 右侧柱状图 */}
        <div className="flex-1">
          <div className="relative">
            {/* Y轴标签 */}
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-sm font-medium text-gray-600">
              {yAxisLabel}
            </div>

            {/* 图表主体 */}
            <div className="ml-8">
              {/* Y轴网格 */}
              {showGrid && (
                <div className="absolute left-8 right-0 top-0 bottom-12">
                  {yTicks.map((tickValue, index) => {
                    const ratio = tickValue / maxValue;
                    return (
                      <div
                        key={index}
                        className="absolute left-0 right-0 border-t border-gray-100"
                        style={{ top: `${(1 - ratio) * 100}%` }}
                      >
                        <div className="absolute -left-16 -translate-y-1/2 text-xs text-gray-400">
                          {tickValue.toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 柱状图 */}
              <div className="relative" style={{ height: `${chartHeight}px` }}>
                <div className="flex h-full items-end pb-8">
                  {filteredAndSortedData.map((group, groupIndex) => {
                    const groupTotal = group.values.reduce((sum, v) => sum + v.value, 0);
                    
                    return (
                      <div
                        key={groupIndex}
                        className="flex items-end"
                        style={{ 
                          marginRight: groupIndex < filteredAndSortedData.length - 1 ? `${groupSpacing}px` : '0',
                          width: barGroups * barWidth + (barGroups - 1) * barSpacing
                        }}
                      >
                        {group.values.map((bar, barIndex) => {
                          const barHeight = (bar.value / maxValue) * (chartHeight - chartPadding.top - chartPadding.bottom);
                          const isHovered = hoveredBar?.category === group.category && 
                                           hoveredBar?.label === bar.label;
                          const isSelected = selectedBar?.category === group.category && 
                                           selectedBar?.label === bar.label;
                          
                          return (
                            <div
                              key={barIndex}
                              className="relative group"
                              style={{ 
                                marginRight: barIndex < group.values.length - 1 ? `${barSpacing}px` : '0'
                              }}
                              onMouseEnter={() => setHoveredBar({
                                category: group.category,
                                label: bar.label
                              })}
                              onMouseLeave={() => setHoveredBar(null)}
                            >
                              {/* 柱状条 */}
                              <div
                                className="rounded-t-lg transition-all duration-300 cursor-pointer"
                                style={{
                                  width: `${barWidth}px`,
                                  height: `${barHeight}px`,
                                  backgroundColor: bar.color,
                                  minHeight: '4px',
                                  boxShadow: isHovered || isSelected 
                                    ? `0 4px 12px ${bar.color}80`
                                    : 'none',
                                  transform: isHovered || isSelected ? 'translateY(-4px)' : 'none',
                                  opacity: isSelected ? 1 : 0.9
                                }}
                                onClick={() => {
                                  setSelectedBar({ category: group.category, label: bar.label });
                                  setEditValue(bar.value);
                                }}
                              />
                              
                              {/* 数值标签 */}
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-700 whitespace-nowrap">
                                {showPercentage 
                                  ? `${getPercentage(bar.value, groupTotal)}%`
                                  : bar.value.toLocaleString()}
                              </div>
                              
                              {/* 悬停提示 */}
                              {isHovered && (
                                <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap z-10 shadow-lg pointer-events-none">
                                  <div className="font-medium">{bar.label}</div>
                                  <div className="text-gray-300 text-xs">{group.category}</div>
                                  <div className="mt-1 font-bold">{bar.value.toLocaleString()}</div>
                                  {showPercentage && (
                                    <div className="text-xs text-gray-300">
                                      占比: {getPercentage(bar.value, groupTotal)}%
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* X轴标签 */}
              <div className="flex justify-between mt-2 px-4">
                {filteredAndSortedData.map((group, index) => (
                  <div
                    key={index}
                    className="text-center text-sm text-gray-600 font-medium"
                    style={{ 
                      width: barGroups * barWidth + (barGroups - 1) * barSpacing,
                      marginRight: index < filteredAndSortedData.length - 1 ? `${groupSpacing}px` : '0'
                    }}
                  >
                    {group.category}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 图例 */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-4 justify-center">
              {data[0]?.values.map((value, index) => (
                <div 
                  key={index} 
                  className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${
                    selectedBar?.label === value.label ? 'bg-gray-100' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    if (selectedBar?.label === value.label) {
                      setSelectedBar(null);
                    } else if (data[0]) {
                      setSelectedBar({ category: data[0].category, label: value.label });
                    }
                  }}
                >
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: value.color }}
                  />
                  <span className="text-sm text-gray-600">{value.label}</span>
                </div>
              ))}
            </div>

            {/* 提示信息 */}
            <div className="mt-4 text-xs text-gray-400 text-center">
              点击柱子或表格单元格选中 • 在左侧面板修改数值
            </div>
          </div>
        </div>
      </div>
    </ChartContainer>
  );
};

export default BarChart;