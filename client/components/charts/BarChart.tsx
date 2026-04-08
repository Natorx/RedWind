// components/BarChart.tsx
import React, { useState } from 'react';
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
}

const BarChart: React.FC<BarChartProps> = ({
  data,
  title,
  yAxisLabel = '数值',
  showGrid = true,
  barWidth = 40,
  barSpacing = 8,
  groupSpacing = 20
}) => {
  const [hoveredBar, setHoveredBar] = useState<{category: string; label: string} | null>(null);
  
  // 计算最大值用于缩放
  const maxValue = Math.max(...data.flatMap(d => d.values.map(v => v.value)));
  const barGroups = data[0]?.values.length || 1;
  
  // 计算图表总宽度
  const chartHeight = 320; // 固定高度，使用像素单位
  const chartPadding = { top: 40, right: 40, bottom: 60, left: 60 };
  
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

  return (
    <ChartContainer title={title}>
      <div className="relative">
        {/* Y轴标签 */}
        <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center">
          <div className="-rotate-90 whitespace-nowrap text-sm text-gray-500">
            {yAxisLabel}
          </div>
        </div>

        {/* 图表主体 */}
        <div className="ml-12">
          {/* Y轴网格 */}
          {showGrid && (
            <div className="absolute left-12 right-0 top-0 bottom-12">
              {yTicks.map((tickValue, index) => {
                const ratio = tickValue / maxValue;
                return (
                  <div
                    key={index}
                    className="absolute left-0 right-0 border-t border-gray-200"
                    style={{ top: `${(1 - ratio) * 100}%` }}
                  >
                    <div className="absolute -left-10 -translate-y-1/2 text-sm text-gray-400">
                      {tickValue.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 柱状图 */}
          <div className="relative" style={{ height: `${chartHeight}px` }}>
            <div className="flex h-full items-end pl-4 pr-8">
              {data.map((group, groupIndex) => (
                <div
                  key={groupIndex}
                  className="flex items-end"
                  style={{ 
                    marginRight: groupIndex < data.length - 1 ? `${groupSpacing}px` : '0',
                    width: barGroups * barWidth + (barGroups - 1) * barSpacing
                  }}
                >
                  {group.values.map((bar, barIndex) => {
                    // 使用像素单位计算高度，确保差异明显
                    const barHeight = (bar.value / maxValue) * (chartHeight - chartPadding.top - chartPadding.bottom);
                    const isHovered = hoveredBar?.category === group.category && 
                                     hoveredBar?.label === bar.label;
                    
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
                          className="rounded-t-lg transition-all duration-300 group-hover:opacity-90 cursor-pointer"
                          style={{
                            width: `${barWidth}px`,
                            height: `${barHeight}px`,
                            backgroundColor: bar.color,
                            minHeight: '4px',
                            boxShadow: isHovered 
                              ? `0 4px 12px ${bar.color}40`
                              : 'none',
                            transform: isHovered ? 'translateY(-4px)' : 'none'
                          }}
                        />
                        
                        {/* 数值标签 */}
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                          {bar.value.toLocaleString()}
                        </div>
                        
                        {/* 悬停提示 */}
                        {isHovered && (
                          <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap z-10 shadow-lg">
                            <div className="font-medium">{bar.label}</div>
                            <div className="text-gray-300 text-xs">{group.category}</div>
                            <div className="mt-1 font-bold">{bar.value.toLocaleString()}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* X轴标签 */}
          <div className="flex justify-between mt-2 px-4">
            {data.map((group, index) => (
              <div
                key={index}
                className="text-center text-sm text-gray-600 font-medium"
                style={{ 
                  width: barGroups * barWidth + (barGroups - 1) * barSpacing,
                  marginRight: index < data.length - 1 ? `${groupSpacing}px` : '0'
                }}
              >
                {group.category}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 图例和统计信息 */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap justify-between items-center">
          {/* 图例 */}
          {data[0]?.values && (
            <div className="flex flex-wrap gap-4">
              {data[0].values.map((value, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: value.color }}
                  />
                  <span className="text-sm text-gray-600">{value.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* 统计信息 */}
          <div className="text-sm text-gray-500">
            总计: {data.flatMap(d => d.values).reduce((sum, v) => sum + v.value, 0).toLocaleString()}
            <span className="ml-4">
              最大值: {maxValue.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </ChartContainer>
  );
};

export default BarChart;
