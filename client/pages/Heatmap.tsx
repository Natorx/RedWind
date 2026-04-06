import React, { useState, useMemo } from 'react';

interface HeatmapData {
  date: string; // YYYY-MM-DD格式
  value: number;
}

interface HeatmapProps {
  data: HeatmapData[];
  startDate?: string; // YYYY-MM-DD格式
  endDate?: string;   // YYYY-MM-DD格式
  showLabels?: boolean;
  showTooltip?: boolean;
}

const Heatmap: React.FC<HeatmapProps> = ({
  data,
  startDate,
  endDate,
  showLabels = true,
  showTooltip = true,
}) => {
  // 工具提示状态
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

  // 处理数据：生成日期范围和dataMap
  const { dateRange, dataMap, maxValue } = useMemo(() => {
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
    data.forEach(item => {
      map.set(item.date, item.value);
    });
    
    const max = Math.max(...data.map(item => item.value), 1);
    
    return { 
      dateRange: dates, 
      dataMap: map, 
      maxValue: max 
    };
  }, [data, startDate, endDate]);

  // 获取颜色等级（类似GitHub的4级颜色）
  const getColorLevel = (value: number): string => {
    if (value === 0) return 'bg-gray-100 dark:bg-gray-800';
    
    const level = Math.ceil((value / maxValue) * 4);
    
    switch (level) {
      case 1: return 'bg-green-200 dark:bg-green-900';
      case 2: return 'bg-green-300 dark:bg-green-700';
      case 3: return 'bg-green-400 dark:bg-green-600';
      case 4: return 'bg-green-500 dark:bg-green-500';
      default: return 'bg-green-600 dark:bg-green-400';
    }
  };

  // 按星期分组（7行 x N列）
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
    
    dateRange.forEach(date => {
      const day = new Date(date).getDay();
      const value = dataMap.get(date) || 0;
      weeks[day].push({ date, value });
    });
    
    // 计算最大列数
    const weekCount = Math.max(...Object.values(weeks).map(arr => arr.length));
    
    return { weeks, weekCount };
  }, [dateRange, dataMap]);

  // 星期标签
  const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];

  // 月份标签
  const monthLabels = useMemo(() => {
    const months: { month: number; week: number }[] = [];
    let currentMonth = -1;
    
    // 找到每个月第一天的位置
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

  // 处理鼠标事件
  const handleMouseEnter = (e: React.MouseEvent, date: string, value: number) => {
    if (!showTooltip) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY - 50,
      date,
      value,
    });
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  // 格式化日期显示
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    };
    return date.toLocaleDateString('zh-CN', options);
  };

  return (
    <div className="relative font-sans">
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
                    marginLeft: week === 0 ? '0' : `40px`,
                    width: '44px'
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
                  
                  return (
                    <div
                      key={date}
                      className={`w-4 h-4 rounded-sm mb-1 cursor-pointer transition-colors duration-200 ${getColorLevel(value)}`}
                      onMouseEnter={(e) => handleMouseEnter(e, date, value)}
                      onMouseLeave={handleMouseLeave}
                      title={showTooltip ? undefined : `${date}: ${value}次提交`}
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
            提交次数
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
      
      {/* 工具提示 */}
      {showTooltip && tooltip.visible && (
        <div
          className="fixed z-50 px-3 py-2 text-sm bg-gray-900 text-white rounded-md shadow-lg"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-medium">{tooltip.value} 次提交</div>
          <div className="text-gray-300">{formatDate(tooltip.date)}</div>
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
        </div>
      )}
    </div>
  );
};

export default Heatmap;
