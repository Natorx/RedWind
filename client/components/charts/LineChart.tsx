// components/DualAxisLineChart.tsx
import React, { useState } from 'react';
import ChartContainer from './ChartContainer';

interface DualAxisLineData {
  label: string;
  color: string;
  data: {
    x: string;
    y: number;
  }[];
  axis: 'left' | 'right';
  unit?: string;
  visible?: boolean;
}

interface DualAxisLineChartProps {
  data: DualAxisLineData[];
  title: string;
  xAxisLabel?: string;
  leftAxisLabel?: string;
  rightAxisLabel?: string;
  showDataPoints?: boolean;
  showGrid?: boolean;
}

const DualAxisLineChart: React.FC<DualAxisLineChartProps> = ({
  data: initialData,
  title,
  xAxisLabel = '',
  leftAxisLabel = '左轴',
  rightAxisLabel = '右轴',
  showDataPoints = true,
  showGrid = true
}) => {
  const [data, setData] = useState(initialData.map(d => ({ ...d, visible: d.visible !== false })));
  const [hoveredPoint, setHoveredPoint] = useState<{
    lineIndex: number;
    pointIndex: number;
  } | null>(null);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [editingPoint, setEditingPoint] = useState<{
    lineIndex: number;
    pointIndex: number;
  } | null>(null);

  // 分离左右轴数据（只考虑可见的）
  const visibleData = data.filter(d => d.visible);
  const leftAxisData = visibleData.filter(item => item.axis === 'left');
  const rightAxisData = visibleData.filter(item => item.axis === 'right');

  // 计算左右轴的数据范围
  const leftValues = leftAxisData.flatMap(line => line.data.map(point => point.y));
  const rightValues = rightAxisData.flatMap(line => line.data.map(point => point.y));
  
  const leftMin = leftValues.length > 0 ? Math.min(...leftValues) : 0;
  const leftMax = leftValues.length > 0 ? Math.max(...leftValues) : 100;
  const rightMin = rightValues.length > 0 ? Math.min(...rightValues) : 0;
  const rightMax = rightValues.length > 0 ? Math.max(...rightValues) : 100;
  
  const leftRange = leftMax - leftMin;
  const rightRange = rightMax - rightMin;

  // 获取所有x轴标签
  const xValues = visibleData[0]?.data.map(point => point.x) || [];
  const pointCount = xValues.length;

  // 更新数据点
  const updatePointValue = (lineIndex: number, pointIndex: number, newValue: number) => {
    const newData = [...data];
    newData[lineIndex].data[pointIndex].y = newValue;
    setData(newData);
  };

  // 添加新数据点
  const addDataPoint = (lineIndex: number) => {
    const newData = [...data];
    const currentData = newData[lineIndex].data;
    if (currentData.length === 0) {
      currentData.push({ x: '点1', y: 50 });
    } else {
      const lastX = currentData[currentData.length - 1].x;
      const nextNum = parseInt(lastX.match(/\d+/)?.pop() || '0') + 1;
      currentData.push({ x: `点${nextNum}`, y: 50 });
    }
    setData(newData);
  };

  // 删除数据点
  const deleteDataPoint = (lineIndex: number, pointIndex: number) => {
    const newData = [...data];
    newData[lineIndex].data.splice(pointIndex, 1);
    if (newData[lineIndex].data.length === 0) {
      newData[lineIndex].data.push({ x: '点1', y: 0 });
    }
    setData(newData);
  };

  // 切换线条可见性
  const toggleVisibility = (lineIndex: number) => {
    const newData = [...data];
    newData[lineIndex].visible = !newData[lineIndex].visible;
    setData(newData);
  };

  // 更新x轴标签
  const updateXLabel = (pointIndex: number, newLabel: string) => {
    // 更新所有线条的相同索引的x标签
    const newData = [...data];
    newData.forEach(line => {
      if (line.data[pointIndex]) {
        line.data[pointIndex].x = newLabel;
      }
    });
    setData(newData);
  };

  // 获取所有x标签（统一）
  const allXLabels = data[0]?.data.map(p => p.x) || [];

  return (
    <ChartContainer title={title}>
      <div className="flex gap-6">
        {/* 左侧控制面板 */}
        <div className="w-96 flex-shrink-0 overflow-y-auto max-h-[600px] pr-4">
          <div className="sticky top-0 bg-white pb-4 mb-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">控制面板</h3>
            <div className="text-xs text-gray-500">
              共 {data.length} 条折线 • {pointCount} 个数据点
            </div>
          </div>

          {/* X轴标签编辑 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="font-medium text-gray-700 mb-3">X轴标签</div>
            <div className="flex flex-wrap gap-2">
              {allXLabels.map((label, index) => (
                <input
                  key={index}
                  type="text"
                  value={label}
                  onChange={(e) => updateXLabel(index, e.target.value)}
                  className="px-2 py-1 text-sm border rounded-md w-20 text-center"
                  size={6}
                />
              ))}
            </div>
          </div>

          {/* 每条折线的控制 */}
          {data.map((line, lineIndex) => {
            const isVisible = line.visible;
            const isLeftAxis = line.axis === 'left';
            
            return (
              <div 
                key={lineIndex} 
                className={`mb-6 p-4 rounded-lg transition-all ${
                  selectedLine === lineIndex ? 'bg-blue-50 ring-2 ring-blue-300' : 'bg-gray-50'
                } ${!isVisible ? 'opacity-50' : ''}`}
                onClick={() => setSelectedLine(lineIndex)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-0.5" 
                      style={{ 
                        backgroundColor: line.color,
                        borderBottom: isLeftAxis ? 'none' : '2px dashed',
                        borderColor: line.color
                      }}
                    />
                    <span className="font-medium text-gray-800">{line.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isLeftAxis ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {isLeftAxis ? leftAxisLabel : rightAxisLabel}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addDataPoint(lineIndex);
                      }}
                      className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                    >
                      + 添加点
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVisibility(lineIndex);
                      }}
                      className="px-2 py-1 text-xs bg-white rounded-md shadow-sm hover:shadow transition-shadow"
                    >

                    </button>
                  </div>
                </div>
                
                {/* 数据点编辑表格 */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 font-medium mb-2">
                    <div>X标签</div>
                    <div>数值</div>
                    <div>操作</div>
                  </div>
                  {line.data.map((point, pointIndex) => (
                    <div key={pointIndex} className="grid grid-cols-3 gap-2 items-center">
                      <span className="text-sm text-gray-600 truncate">{point.x}</span>
                      <input
                        type="number"
                        value={point.y}
                        onChange={(e) => updatePointValue(lineIndex, pointIndex, parseFloat(e.target.value))}
                        className="px-2 py-1 text-sm border rounded-md w-full"
                        step="1"
                        onFocus={() => setEditingPoint({ lineIndex, pointIndex })}
                        onBlur={() => setEditingPoint(null)}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDataPoint(lineIndex, pointIndex);
                        }}
                        className="px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        disabled={line.data.length <= 1}
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="mt-3 pt-2 text-xs text-gray-500">
                  {isLeftAxis ? leftAxisLabel : rightAxisLabel} - 
                  范围: [{Math.min(...line.data.map(p => p.y)).toFixed(0)}, {Math.max(...line.data.map(p => p.y)).toFixed(0)}]
                  {line.unit && ` • 单位: ${line.unit}`}
                </div>
              </div>
            );
          })}
        </div>

        {/* 右侧双轴折线图 */}
        <div className="flex-1">
          <div className="relative">
            {/* 左Y轴标签 */}
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-sm font-medium text-gray-600">
              {leftAxisLabel}
            </div>

            {/* 右Y轴标签 */}
            <div className="absolute -right-2 top-1/2 -translate-y-1/2 rotate-90 whitespace-nowrap text-sm font-medium text-gray-600">
              {rightAxisLabel}
            </div>

            {/* 图表主体 */}
            <div className="mx-8 mb-6">
              <div className="relative h-80 bg-white border border-gray-200 rounded-lg">
                {/* 左Y轴网格 */}
                {showGrid && (
                  <>
                    {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio, index) => (
                      <div
                        key={`left-${index}`}
                        className="absolute left-0 right-0 border-t border-gray-100"
                        style={{ top: `${(1 - ratio) * 100}%` }}
                      >
                        <div className="absolute -left-16 -translate-y-1/2 text-xs text-gray-400">
                          {(leftMin + ratio * leftRange).toFixed(0)}
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* 右Y轴网格 */}
                {showGrid && (
                  <>
                    {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio, index) => (
                      <div
                        key={`right-${index}`}
                        className="absolute left-0 right-0 border-t border-gray-100 border-dashed"
                        style={{ top: `${(1 - ratio) * 100}%` }}
                      >
                        <div className="absolute -right-16 -translate-y-1/2 text-xs text-gray-400">
                          {(rightMin + ratio * rightRange).toFixed(0)}
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* 垂直网格线 */}
                {showGrid && pointCount > 1 && (
                  <>
                    {Array.from({ length: pointCount }).map((_, index) => (
                      <div
                        key={`v-${index}`}
                        className="absolute top-0 bottom-0 border-l border-gray-100"
                        style={{ left: `${(index / (pointCount - 1)) * 100}%` }}
                      />
                    ))}
                  </>
                )}

                {/* 折线图 SVG */}
                <svg className="w-full h-full" viewBox="0 0 1000 300" preserveAspectRatio="none">
                  {visibleData.map((line) => {
                    const originalIndex = data.findIndex(d => d.label === line.label);
                    const isLeftAxis = line.axis === 'left';
                    const minY = isLeftAxis ? leftMin : rightMin;
                    const range = isLeftAxis ? leftRange : rightRange;

                    // 转换坐标为SVG坐标
                    const points = line.data.map((point, pointIndex) => ({
                      x: pointCount === 1 ? 500 : (pointIndex / (pointCount - 1)) * 1000,
                      y: range === 0 ? 150 : 300 - ((point.y - minY) / range) * 300
                    }));

                    // 生成路径
                    let pathData = '';
                    if (points.length > 0) {
                      pathData = `M ${points[0].x},${points[0].y}`;
                      for (let i = 1; i < points.length; i++) {
                        pathData += ` L ${points[i].x},${points[i].y}`;
                      }
                    }

                    return (
                      <g key={originalIndex}>
                        {/* 折线 */}
                        <path
                          d={pathData}
                          fill="none"
                          stroke={line.color}
                          strokeWidth={selectedLine === originalIndex ? 3 : 2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray={isLeftAxis ? "none" : "6 4"}
                          className="transition-all duration-300 cursor-pointer"
                          onMouseEnter={() => setSelectedLine(originalIndex)}
                        />

                        {/* 数据点 */}
                        {showDataPoints && points.map((point, pointIndex) => {
                          const isHovered = hoveredPoint?.lineIndex === originalIndex && 
                                           hoveredPoint?.pointIndex === pointIndex;
                          const isEditing = editingPoint?.lineIndex === originalIndex && 
                                           editingPoint?.pointIndex === pointIndex;
                          
                          return (
                            <g key={pointIndex}>
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r={isHovered || isEditing ? 7 : 4}
                                fill="white"
                                stroke={line.color}
                                strokeWidth={isHovered || isEditing ? 3 : 2}
                                className="cursor-pointer transition-all duration-200"
                                onMouseEnter={() => setHoveredPoint({
                                  lineIndex: originalIndex,
                                  pointIndex
                                })}
                                onMouseLeave={() => setHoveredPoint(null)}
                              />
                              
                              {/* 数值标签（始终显示） */}
                              <text
                                x={point.x}
                                y={point.y - 10}
                                textAnchor="middle"
                                className="text-[10px] fill-gray-500"
                              >
                                {line.data[pointIndex].y.toFixed(0)}
                              </text>
                              
                              {/* 悬停详细提示 */}
                              {isHovered && (
                                <g>
                                  <rect
                                    x={point.x - 55}
                                    y={point.y - 65}
                                    width="110"
                                    height="55"
                                    rx="6"
                                    fill="#1f2937"
                                    className="shadow-lg"
                                  />
                                  <text
                                    x={point.x}
                                    y={point.y - 48}
                                    textAnchor="middle"
                                    className="text-xs fill-white"
                                  >
                                    {line.data[pointIndex].x}
                                  </text>
                                  <text
                                    x={point.x}
                                    y={point.y - 33}
                                    textAnchor="middle"
                                    className="text-sm font-bold fill-white"
                                  >
                                    {line.data[pointIndex].y.toFixed(1)}
                                    {line.unit && ` ${line.unit}`}
                                  </text>
                                  <text
                                    x={point.x}
                                    y={point.y - 18}
                                    textAnchor="middle"
                                    className="text-[10px] fill-gray-300"
                                  >
                                    {line.label} ({line.axis === 'left' ? leftAxisLabel : rightAxisLabel})
                                  </text>
                                </g>
                              )}
                            </g>
                          );
                        })}
                      </g>
                    );
                  })}
                </svg>

                {/* X轴 */}
                <div className="absolute bottom-0 left-0 right-0 border-t border-gray-300" />
              </div>

              {/* X轴标签 */}
              {xValues.length > 0 && (
                <div className="flex justify-between mt-2 px-4">
                  {xValues.map((label, index) => (
                    <div
                      key={index}
                      className="text-center text-xs text-gray-500"
                      style={{ 
                        width: `${100 / pointCount}%`,
                        transform: 'translateX(-50%)'
                      }}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              )}

              {/* X轴标题 */}
              {xAxisLabel && (
                <div className="text-center text-sm text-gray-500 mt-4">
                  {xAxisLabel}
                </div>
              )}
            </div>
          </div>

          {/* 图例和统计信息 */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap justify-between items-center">
              {/* 图例 - 可点击切换 */}
              <div className="flex flex-wrap gap-4">
                {data.map((line, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${
                      selectedLine === index ? 'bg-gray-100' : 'hover:bg-gray-50'
                    } ${!line.visible ? 'opacity-40' : ''}`}
                    onClick={() => {
                      setSelectedLine(index);
                      if (!line.visible) toggleVisibility(index);
                    }}
                  >
                    <div
                      className={`w-4 ${line.axis === 'left' ? 'h-0.5' : 'border-b-2 border-dashed'}`}
                      style={{ 
                        backgroundColor: line.axis === 'left' ? line.color : 'transparent',
                        borderColor: line.color,
                        borderBottomWidth: line.axis === 'right' ? '2px' : '0'
                      }}
                    />
                    <span className="text-sm text-gray-600">{line.label}</span>
                    <span className="text-xs text-gray-400">
                      ({line.axis === 'left' ? leftAxisLabel : rightAxisLabel})
                    </span>
                  </div>
                ))}
              </div>

              {/* 统计信息 */}
              <div className="text-sm text-gray-500">
                总计 {pointCount} 个数据点
                {selectedLine !== null && data[selectedLine] && (
                  <span className="ml-4 font-medium text-gray-700">
                    当前: {data[selectedLine].label} - 
                    平均值: {(data[selectedLine].data.reduce((a, b) => a + b.y, 0) / pointCount).toFixed(1)}
                  </span>
                )}
              </div>
            </div>

            {/* 选中线条的详细信息 */}
            {selectedLine !== null && data[selectedLine] && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      {data[selectedLine].label} - {data[selectedLine].axis === 'left' ? leftAxisLabel : rightAxisLabel}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      最大值: {Math.max(...data[selectedLine].data.map(p => p.y)).toFixed(1)} | 
                      最小值: {Math.min(...data[selectedLine].data.map(p => p.y)).toFixed(1)}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedLine(null)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    取消选择
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ChartContainer>
  );
};

export default DualAxisLineChart;