import React, { useState, useMemo } from 'react';

interface HeatmapData {
  date: string; // YYYY-MM-DD格式
  value: number;
}

interface HeatmapProps {
  data: HeatmapData[];
  startDate?: string; // YYYY-MM-DD格式
  endDate?: string; // YYYY-MM-DD格式
  showLabels?: boolean;
  showTooltip?: boolean;
  onDataChange?: (data: HeatmapData[]) => void;
}

const Heatmap: React.FC<HeatmapProps> = ({
  data: initialData,
  startDate,
  endDate,
  showLabels = true,
  showTooltip = true,
  onDataChange,
}) => {
  // 状态管理
  const [data, setData] = useState<HeatmapData[]>(initialData);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    date: string;
    value: number;
  }>({
    visible: false,
    x: 0,
    y: 0,
    date: '',
    value: 0,
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filterMinValue, setFilterMinValue] = useState<number>(0);
  const [filterMaxValue, setFilterMaxValue] = useState<number>(100);
  const [sortBy, setSortBy] = useState<'date' | 'value'>('date');

  // 处理数据：生成日期范围和dataMap
  const { dateRange, dataMap, maxValue, filteredData } = useMemo(() => {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getFullYear() - 1, end.getMonth(), end.getDate() + 1);

    const dates: string[] = [];
    const current = new Date(start);

    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    // 创建dataMap
    const map = new Map<string, number>();
    data.forEach((item) => {
      map.set(item.date, item.value);
    });

    // 过滤数据
    const filtered = data.filter(
      (item) => item.value >= filterMinValue && item.value <= filterMaxValue
    );

    const max = Math.max(...data.map((item) => item.value), 1);

    // 排序数据
    const sortedData = [...filtered].sort((a, b) => {
      if (sortBy === 'date') {
        return a.date.localeCompare(b.date);
      } else {
        return b.value - a.value;
      }
    });

    return {
      dateRange: dates,
      dataMap: map,
      maxValue: max,
      filteredData: sortedData,
    };
  }, [data, startDate, endDate, filterMinValue, filterMaxValue, sortBy]);

  // 获取颜色等级
  const getColorLevel = (value: number): string => {
    if (value === 0) return 'bg-gray-100 dark:bg-gray-800';

    const level = Math.ceil((value / maxValue) * 4);

    switch (level) {
      case 1:
        return 'bg-green-200 dark:bg-green-900';
      case 2:
        return 'bg-green-300 dark:bg-green-700';
      case 3:
        return 'bg-green-400 dark:bg-green-600';
      case 4:
        return 'bg-green-500 dark:bg-green-500';
      default:
        return 'bg-green-600 dark:bg-green-400';
    }
  };

  // 按星期分组
  const { weeks, weekCount } = useMemo(() => {
    const weeks: { [key: number]: { date: string; value: number }[] } = {
      0: [], // 周日
      1: [], // 周一
      2: [], // 周二
      3: [], // 周三
      4: [], // 周四
      5: [], // 周五
      6: [], // 周六
    };

    dateRange.forEach((date) => {
      const day = new Date(date).getDay();
      const value = dataMap.get(date) || 0;
      weeks[day].push({ date, value });
    });

    const weekCount = Math.max(
      ...Object.values(weeks).map((arr) => arr.length)
    );

    return { weeks, weekCount };
  }, [dateRange, dataMap]);

  // 星期标签
  const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];

  // 月份标签
  const monthLabels = useMemo(() => {
    const months: { month: number; week: number }[] = [];
    let currentMonth = -1;

    dateRange.forEach((date, index) => {
      const month = new Date(date).getMonth();
      const weekIndex = Math.floor(index / 7);

      if (month !== currentMonth) {
        months.push({ month, week: weekIndex });
        currentMonth = month;
      }
    });

    return months;
  }, [dateRange]);

  // 更新数据点的值
  const updateDataValue = (date: string, newValue: number) => {
    const newData = [...data];
    const existingIndex = newData.findIndex((item) => item.date === date);

    if (newValue === 0) {
      // 如果值为0，移除该数据点
      if (existingIndex !== -1) {
        newData.splice(existingIndex, 1);
      }
    } else {
      if (existingIndex !== -1) {
        newData[existingIndex] = { ...newData[existingIndex], value: newValue };
      } else {
        newData.push({ date, value: newValue });
      }
    }

    setData(newData);
    if (onDataChange) {
      onDataChange(newData);
    }
  };

  // 批量设置值
  const batchSetValue = (value: number, target?: 'all' | 'selected') => {
    if (target === 'all') {
      const newData = dateRange.map((date) => ({ date, value }));
      setData(newData);
      if (onDataChange) onDataChange(newData);
    } else if (target === 'selected' && selectedDate) {
      updateDataValue(selectedDate, value);
    }
  };

  // 计算统计数据
  const statistics = useMemo(() => {
    const values = data.map((d) => d.value);
    const total = values.reduce((a, b) => a + b, 0);
    const avg = total / values.length || 0;
    const max = Math.max(...values, 0);
    const min = Math.min(...values, 0);
    const daysWithValue = values.filter((v) => v > 0).length;

    return { total, avg, max, min, daysWithValue };
  }, [data]);

  // 导出数据
  const exportData = () => {
    const csv = data.map((item) => `${item.date},${item.value}`).join('\n');
    const blob = new Blob([`日期,数值\n${csv}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `heatmap_data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导入数据
  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newData: HeatmapData[] = [];

      for (let i = 1; i < lines.length; i++) {
        const [date, value] = lines[i].split(',');
        if (date && value && !isNaN(parseFloat(value))) {
          newData.push({ date, value: parseFloat(value) });
        }
      }

      setData(newData);
      if (onDataChange) onDataChange(newData);
    };
    reader.readAsText(file);
  };

  // 清空所有数据
  const clearAllData = () => {
    if (confirm('确定要清空所有数据吗？')) {
      setData([]);
      if (onDataChange) onDataChange([]);
    }
  };

  // 设置示例数据
// 简化版：更自然的提交模式
const setSampleData = () => {
  const sampleData: HeatmapData[] = [];
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);

  // 生成基础模式
  const current = new Date(start);
  let lastCommitValue = 0;
  
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // 生成提交次数的基础逻辑
    let commitCount = 0;
    
    // 周末很少提交
    if (isWeekend) {
      commitCount = Math.random() < 0.2 ? Math.floor(Math.random() * 3) + 1 : 0;
    } else {
      // 工作日：使用马尔可夫链风格的生成
      let baseChance = 0.7;
      
      // 如果昨天有提交，今天继续提交的概率增加
      if (lastCommitValue > 0) {
        baseChance += 0.15;
      } else {
        baseChance -= 0.1;
      }
      
      // 偶尔有高产期
      const isHighProductivity = Math.random() < 0.1;
      if (isHighProductivity) {
        commitCount = Math.floor(Math.random() * 15) + 8;
      } 
      // 普通工作日
      else if (Math.random() < baseChance) {
        commitCount = Math.floor(Math.random() * 7) + 1;
        // 30%概率有较多提交
        if (Math.random() < 0.3) {
          commitCount += Math.floor(Math.random() * 5);
        }
      }
    }
    
    // 添加一些随机波动
    if (commitCount > 0) {
      commitCount += Math.floor((Math.random() - 0.5) * 2);
      commitCount = Math.max(1, commitCount);
    }
    
    if (commitCount > 0) {
      sampleData.push({
        date: dateStr,
        value: commitCount,
      });
      lastCommitValue = commitCount;
    } else {
      lastCommitValue = 0;
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  setData(sampleData);
  if (onDataChange) onDataChange(sampleData);
};

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    };
    return date.toLocaleDateString('zh-CN', options);
  };

  // 获取选中日期的当前值
  const getSelectedValue = () => {
    if (!selectedDate) return 0;
    return dataMap.get(selectedDate) || 0;
  };

  return (
    <div className="flex gap-6 font-sans">
      {/* 左侧控制面板 */}
      <div className="w-80 flex-shrink-0 overflow-y-auto max-h-[600px] pr-4">
        <div className="sticky top-0 bg-white pb-4 mb-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">控制面板</h3>
          <div className="text-xs text-gray-500">
            总计 {data.length} 个数据点 • 有效天数 {statistics.daysWithValue}
          </div>
        </div>

        {/* 统计信息 */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
          <div className="font-medium text-gray-700 mb-2">统计摘要</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-500">总计</div>
              <div className="font-bold text-gray-800">{statistics.total}</div>
            </div>
            <div>
              <div className="text-gray-500">平均值</div>
              <div className="font-bold text-gray-800">{statistics.avg.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-gray-500">最大值</div>
              <div className="font-bold text-green-600">{statistics.max}</div>
            </div>
            <div>
              <div className="text-gray-500">最小值</div>
              <div className="font-bold text-orange-600">{statistics.min}</div>
            </div>
          </div>
        </div>

        {/* 日期选择器 */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="font-medium text-gray-700 mb-3">选中日期</div>
          <select
            className="w-full px-3 py-2 border rounded-md text-sm mb-3"
            value={selectedDate || ''}
            onChange={(e) => setSelectedDate(e.target.value || null)}
          >
            <option value="">请选择日期</option>
            {dateRange.slice(-90).map((date) => (
              <option key={date} value={date}>
                {date} - {formatDate(date).split(' ')[0]}
              </option>
            ))}
          </select>

          {selectedDate && (
            <div>
              <div className="text-sm text-gray-600 mb-2">
                当前值: <span className="font-bold">{getSelectedValue()}</span>
              </div>
              <input
                type="range"
                min="0"
                max={maxValue}
                value={getSelectedValue()}
                onChange={(e) => updateDataValue(selectedDate, parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mb-2"
                style={{
                  background: `linear-gradient(to right, #10B981 0%, #10B981 ${(getSelectedValue() / maxValue) * 100}%, #E5E7EB ${(getSelectedValue() / maxValue) * 100}%, #E5E7EB 100%)`,
                }}
              />
              <input
                type="number"
                value={getSelectedValue()}
                onChange={(e) => updateDataValue(selectedDate, parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1 text-sm border rounded-md"
                min="0"
                max={maxValue}
              />
            </div>
          )}
        </div>

        {/* 批量操作 */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="font-medium text-gray-700 mb-3">批量操作</div>
          <div className="space-y-2">
            <button
              onClick={() => batchSetValue(0, 'all')}
              className="w-full px-3 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
            >
              清空所有数据
            </button>
            <button
              onClick={() => batchSetValue(5, 'all')}
              className="w-full px-3 py-2 text-sm bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 transition-colors"
            >
              设置所有为 5
            </button>
            <button
              onClick={() => batchSetValue(10, 'all')}
              className="w-full px-3 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
            >
              设置所有为 10
            </button>
            <button
              onClick={setSampleData}
              className="w-full px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
            >
              生成示例数据
            </button>
          </div>
        </div>

        {/* 筛选和排序 */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="font-medium text-gray-700 mb-3">筛选与排序</div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500">筛选范围</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="number"
                  placeholder="最小值"
                  value={filterMinValue}
                  onChange={(e) => setFilterMinValue(parseInt(e.target.value) || 0)}
                  className="w-1/2 px-2 py-1 text-sm border rounded-md"
                />
                <input
                  type="number"
                  placeholder="最大值"
                  value={filterMaxValue}
                  onChange={(e) => setFilterMaxValue(parseInt(e.target.value) || 100)}
                  className="w-1/2 px-2 py-1 text-sm border rounded-md"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">排序方式</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'value')}
                className="w-full mt-1 px-2 py-1 text-sm border rounded-md"
              >
                <option value="date">按日期排序</option>
                <option value="value">按数值排序</option>
              </select>
            </div>
          </div>
        </div>

        {/* 数据导入导出 */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="font-medium text-gray-700 mb-3">数据管理</div>
          <div className="space-y-2">
            <button
              onClick={exportData}
              className="w-full px-3 py-2 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors"
            >
              导出数据 (CSV)
            </button>
            <label className="w-full px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors cursor-pointer text-center block">
              导入数据
              <input
                type="file"
                accept=".csv"
                onChange={importData}
                className="hidden"
              />
            </label>
            <button
              onClick={clearAllData}
              className="w-full px-3 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
            >
              清空所有数据
            </button>
          </div>
        </div>

        {/* 数据列表 */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="font-medium text-gray-700 mb-3">数据列表</div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredData.slice(0, 20).map((item) => (
              <div
                key={item.date}
                className={`flex justify-between items-center px-2 py-1 rounded cursor-pointer text-sm ${
                  selectedDate === item.date ? 'bg-blue-100' : 'hover:bg-gray-100'
                }`}
                onClick={() => setSelectedDate(item.date)}
              >
                <span>{item.date}</span>
                <span className="font-medium" style={{ color: '#10B981' }}>
                  {item.value}
                </span>
              </div>
            ))}
            {filteredData.length > 20 && (
              <div className="text-xs text-gray-400 text-center pt-2">
                还有 {filteredData.length - 20} 条数据...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 右侧热力图 */}
      <div className="flex-1">
        <div className="relative">
          {/* 热力图主体 */}
          <div className="flex">
            {/* 星期标签 */}
            {showLabels && (
              <div className="flex flex-col mr-2 pt-6">
                {dayLabels.map((label, index) => (
                  <div
                    key={index}
                    className="text-xs text-gray-500 dark:text-gray-400 h-4 mb-1 text-right"
                    style={{ height: '16px', lineHeight: '16px' }}
                  >
                    {label}
                  </div>
                ))}
              </div>
            )}

            {/* 热力格子 */}
            <div className="flex flex-col">
              {/* 月份标签 */}
              {showLabels && (
                <div className="flex mb-1">
                  {monthLabels.map(({ month, week }, index) => (
                    <div
                      key={index}
                      className="text-xs text-gray-500 dark:text-gray-400"
                      style={{
                        marginLeft: week === 0 ? '0' : '40px',
                        width: '44px',
                      }}
                    >
                      {month + 1}月
                    </div>
                  ))}
                </div>
              )}

              {/* 热力格子网格 */}
              <div className="flex">
                {Array.from({ length: weekCount }).map((_, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col mr-1">
                    {Array.from({ length: 7 }).map((_, dayIndex) => {
                      const cellData = weeks[dayIndex][weekIndex];
                      if (!cellData) {
                        return (
                          <div
                            key={`${weekIndex}-${dayIndex}`}
                            className="w-4 h-4 rounded-sm mb-1 opacity-0"
                          />
                        );
                      }

                      const { date, value } = cellData;
                      const isSelected = selectedDate === date;

                      return (
                        <div
                          key={date}
                          className={`w-4 h-4 rounded-sm mb-1 cursor-pointer transition-all duration-200 ${getColorLevel(value)} ${
                            isSelected ? 'ring-2 ring-blue-400 ring-offset-1' : ''
                          }`}
                          onMouseEnter={(e) => {
                            if (!showTooltip) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            setTooltip({
                              visible: true,
                              x: rect.left + window.scrollX,
                              y: rect.top + window.scrollY - 50,
                              date,
                              value,
                            });
                          }}
                          onMouseLeave={() => {
                            setTooltip((prev) => ({ ...prev, visible: false }));
                          }}
                          onClick={() => setSelectedDate(date)}
                          title={showTooltip ? undefined : `${date}: ${value}次`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* 图例 */}
            <div className="ml-6 flex flex-col justify-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                数值
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-4 h-4 rounded-sm bg-gray-100 dark:bg-gray-800" />
                <span className="text-xs text-gray-500 dark:text-gray-400">0</span>
                <div className="w-4 h-4 rounded-sm bg-green-200 dark:bg-green-900" />
                <div className="w-4 h-4 rounded-sm bg-green-300 dark:bg-green-700" />
                <div className="w-4 h-4 rounded-sm bg-green-400 dark:bg-green-600" />
                <div className="w-4 h-4 rounded-sm bg-green-500 dark:bg-green-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                  {maxValue}+
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="mt-4 text-xs text-gray-400 text-center">
          点击格子选中 • 在左侧面板修改数值
        </div>
      </div>

      {/* 工具提示 */}
      {showTooltip && tooltip.visible && (
        <div
          className="fixed z-50 px-3 py-2 text-sm bg-gray-900 text-white rounded-md shadow-lg pointer-events-none"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-medium">{tooltip.value} 次</div>
          <div className="text-gray-300">{formatDate(tooltip.date)}</div>
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
        </div>
      )}
    </div>
  );
};

export default Heatmap;