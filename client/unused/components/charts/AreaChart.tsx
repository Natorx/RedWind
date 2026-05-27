// components/AreaChart.tsx
import React, { useState, useMemo } from 'react';
import ChartContainer from './ChartContainer';

interface AreaChartData {
  label: string;
  color: string;
  data: {
    x: string;
    y: number;
  }[];
  visible?: boolean;
}

interface AreaChartProps {
  data: AreaChartData[];
  title: string;
  stacked?: boolean;
  showLegend?: boolean;
  onDataChange?: (data: AreaChartData[]) => void;
}

const AreaChart: React.FC<AreaChartProps> = ({
  data: initialData,
  title,
  stacked = false,
  showLegend = true,
  onDataChange
}) => {
  const [data, setData] = useState(initialData.map(d => ({ ...d, visible: d.visible !== false })));
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<{ lineIndex: number; pointIndex: number } | null>(null);
  const [_, setEditValue] = useState<number>(0);
  const [showValues, setShowValues] = useState<boolean>(true);
  const [smoothCurves, setSmoothCurves] = useState<boolean>(false);
  
  // 计算数据范围
  const xValues = data[0]?.data.map(point => point.x) || [];
  const pointCount = xValues.length;
  
  // 获取可见数据
  const visibleData = data.filter(d => d.visible);
  
  // 计算所有数据的最大值
  const maxYValue = useMemo(() => {
    if (stacked) {
      // 堆叠图：计算每个x点的累计最大值
      const stackedTotals = Array(pointCount).fill(0);
      visibleData.forEach(line => {
        line.data.forEach((point, idx) => {
          stackedTotals[idx] += point.y;
        });
      });
      return Math.max(...stackedTotals, 1);
    } else {
      // 普通图：取所有点的最大值
      return Math.max(...visibleData.flatMap(line => line.data.map(p => p.y)), 1);
    }
  }, [visibleData, stacked, pointCount]);
  
  // 如果是堆叠图，计算累计值
  const calculateStackedData = () => {
    const result: number[][] = [];
    for (let i = 0; i < pointCount; i++) {
      const pointValues = [];
      let sum = 0;
      for (const line of visibleData) {
        sum += line.data[i].y;
        pointValues.push(sum);
      }
      result.push(pointValues);
    }
    return result;
  };

  const stackedData = stacked ? calculateStackedData() : null;
  
  // 更新数据点
  const updatePointValue = (lineIndex: number, pointIndex: number, newValue: number) => {
    const newData = [...data];
    newData[lineIndex].data[pointIndex].y = Math.max(0, newValue);
    setData(newData);
    if (onDataChange) onDataChange(newData);
  };
  
  // 添加新数据点
  const addDataPoint = () => {
    const newX = `点${pointCount + 1}`;
    const newData = data.map(line => ({
      ...line,
      data: [...line.data, { x: newX, y: 0 }]
    }));
    setData(newData);
    if (onDataChange) onDataChange(newData);
  };
  
  // 删除数据点
  const deleteDataPoint = (pointIndex: number) => {
    if (pointCount <= 2) {
      alert("至少需要保留2个数据点");
      return;
    }
    const newData = data.map(line => ({
      ...line,
      data: line.data.filter((_, idx) => idx !== pointIndex)
    }));
    setData(newData);
    if (selectedPoint?.pointIndex === pointIndex) setSelectedPoint(null);
    if (onDataChange) onDataChange(newData);
  };
  
  // 更新X轴标签
  const updateXLabel = (pointIndex: number, newLabel: string) => {
    const newData = data.map(line => ({
      ...line,
      data: line.data.map((point, idx) => 
        idx === pointIndex ? { ...point, x: newLabel } : point
      )
    }));
    setData(newData);
    if (onDataChange) onDataChange(newData);
  };
  
  // 切换线条可见性
  const toggleVisibility = (lineIndex: number) => {
    const newData = [...data];
    newData[lineIndex].visible = !newData[lineIndex].visible;
    setData(newData);
    if (onDataChange) onDataChange(newData);
  };
  
  // 添加新线条
  const addLine = () => {
    const newLabel = prompt('请输入新线条名称:');
    if (!newLabel) return;
    
    const newColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
    const newData = data[0]?.data.map(point => ({ x: point.x, y: 0 })) || [];
    
    setData([...data, {
      label: newLabel,
      color: newColor,
      data: newData,
      visible: true
    }]);
  };
  
  // 删除线条
  const deleteLine = (lineIndex: number) => {
    if (data.length <= 1) {
      alert("至少需要保留一条数据线");
      return;
    }
    if (confirm(`确定要删除线条 "${data[lineIndex].label}" 吗？`)) {
      const newData = data.filter((_, idx) => idx !== lineIndex);
      setData(newData);
      if (selectedPoint?.lineIndex === lineIndex) setSelectedPoint(null);
      if (onDataChange) onDataChange(newData);
    }
  };
  
  // 重置所有数据
  const resetData = () => {
    const newData = data.map(line => ({
      ...line,
      data: line.data.map(point => ({ ...point, y: 0 }))
    }));
    setData(newData);
    if (onDataChange) onDataChange(newData);
  };
  
  // 设置随机数据
  const setRandomData = () => {
    const newData = data.map(line => ({
      ...line,
      data: line.data.map(point => ({ ...point, y: Math.floor(Math.random() * 80) + 10 }))
    }));
    setData(newData);
    if (onDataChange) onDataChange(newData);
  };
  
  // 归一化
  const normalizeData = () => {
    const newData = data.map(line => {
      const maxLineValue = Math.max(...line.data.map(p => p.y));
      if (maxLineValue === 0) return line;
      return {
        ...line,
        data: line.data.map(point => ({ ...point, y: (point.y / maxLineValue) * 100 }))
      };
    });
    setData(newData);
    if (onDataChange) onDataChange(newData);
  };
  
  // 获取选中点的值
  const getSelectedValue = () => {
    if (!selectedPoint) return 0;
    return data[selectedPoint.lineIndex]?.data[selectedPoint.pointIndex]?.y || 0;
  };
  
  // 获取统计数据
  const statistics = useMemo(() => {
    const allValues = data.flatMap(line => line.data.map(p => p.y));
    const total = allValues.reduce((a, b) => a + b, 0);
    const avg = total / allValues.length;
    const max = Math.max(...allValues);
    const min = Math.min(...allValues);
    return { total, avg, max, min };
  }, [data]);
  
  // 导出数据
  const exportData = () => {
    const headers = ['X', ...data.map(line => line.label)];
    const rows = data[0]?.data.map((_, idx) => [
      data[0].data[idx].x,
      ...data.map(line => line.data[idx].y.toString())
    ]) || [];
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `areachart_data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // 生成平滑曲线
  const getSmoothPath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) * 0.25;
      const cp1y = p0.y;
      const cp2x = p1.x - (p1.x - p0.x) * 0.25;
      const cp2y = p1.y;
      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`;
    }
    return path;
  };

  return (
    <ChartContainer title={title}>
      <div className="flex gap-6">
        {/* 左侧控制面板 */}
        <div className="w-80 flex-shrink-0 overflow-y-auto max-h-[600px] pr-4">
          <div className="sticky top-0 bg-white pb-4 mb-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">控制面板</h3>
            <div className="text-xs text-gray-500">
              共 {data.length} 条数据线 • {pointCount} 个数据点
            </div>
          </div>

          {/* 统计信息 */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
            <div className="font-medium text-gray-700 mb-2">统计摘要</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-500">总计</div>
                <div className="font-bold text-gray-800">{statistics.total.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-gray-500">平均值</div>
                <div className="font-bold text-gray-800">{statistics.avg.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-gray-500">最大值</div>
                <div className="font-bold text-green-600">{statistics.max.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-gray-500">最小值</div>
                <div className="font-bold text-orange-600">{statistics.min.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* 选中点编辑 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="font-medium text-gray-700 mb-3">编辑数据点</div>
            <select
              className="w-full px-3 py-2 border rounded-md text-sm mb-3"
              value={selectedPoint ? `${selectedPoint.lineIndex}|${selectedPoint.pointIndex}` : ''}
              onChange={(e) => {
                if (e.target.value) {
                  const [lineIndex, pointIndex] = e.target.value.split('|').map(Number);
                  setSelectedPoint({ lineIndex, pointIndex });
                  setEditValue(getSelectedValue());
                } else {
                  setSelectedPoint(null);
                }
              }}
            >
              <option value="">选择数据点</option>
              {data.map((line, lineIdx) => 
                line.data.map((point, pointIdx) => (
                  <option key={`${lineIdx}-${pointIdx}`} value={`${lineIdx}|${pointIdx}`}>
                    {line.label} - {point.x}
                  </option>
                ))
              )}
            </select>

            {selectedPoint && (
              <div>
                <div className="text-sm text-gray-600 mb-2">
                  当前值: <span className="font-bold">{getSelectedValue()}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={maxYValue}
                  value={getSelectedValue()}
                  onChange={(e) => updatePointValue(selectedPoint.lineIndex, selectedPoint.pointIndex, parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mb-2"
                  style={{
                    background: `linear-gradient(to right, ${data[selectedPoint.lineIndex]?.color} 0%, ${data[selectedPoint.lineIndex]?.color} ${(getSelectedValue() / maxYValue) * 100}%, #E5E7EB ${(getSelectedValue() / maxYValue) * 100}%, #E5E7EB 100%)`
                  }}
                />
                <input
                  type="number"
                  value={getSelectedValue()}
                  onChange={(e) => updatePointValue(selectedPoint.lineIndex, selectedPoint.pointIndex, parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1 text-sm border rounded-md"
                  min="0"
                  step="1"
                />
              </div>
            )}
          </div>

          {/* X轴标签管理 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="font-medium text-gray-700 mb-3">X轴标签</div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {xValues.map((label, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => updateXLabel(idx, e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border rounded-md"
                  />
                  <button
                    onClick={() => deleteDataPoint(idx)}
                    className="px-2 py-1 text-xs text-red-500 hover:text-red-700 rounded"
                    disabled={pointCount <= 2}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addDataPoint}
              className="w-full mt-3 px-3 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
            >
              + 添加数据点
            </button>
          </div>

          {/* 线条管理 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="font-medium text-gray-700 mb-3">线条管理</div>
            <div className="space-y-2">
              {data.map((line, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: line.color }} />
                    <span className="text-sm text-gray-600">{line.label}</span>
                    <button
                      onClick={() => toggleVisibility(idx)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >

                    </button>
                  </div>
                  <button
                    onClick={() => deleteLine(idx)}
                    className="px-2 py-1 text-xs text-red-500 hover:text-red-700"
                    disabled={data.length <= 1}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addLine}
              className="w-full mt-3 px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
            >
              + 添加线条
            </button>
          </div>

          {/* 批量操作 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="font-medium text-gray-700 mb-3">批量操作</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="showValues"
                  checked={showValues}
                  onChange={(e) => setShowValues(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="showValues" className="text-sm text-gray-600">
                  显示数据值
                </label>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="smoothCurves"
                  checked={smoothCurves}
                  onChange={(e) => setSmoothCurves(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="smoothCurves" className="text-sm text-gray-600">
                  平滑曲线
                </label>
              </div>
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
                归一化数据
              </button>
              <button
                onClick={resetData}
                className="w-full px-3 py-2 text-sm bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 transition-colors"
              >
                重置所有数据
              </button>
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
                    <th className="text-left py-1">X</th>
                    {data.map((line, idx) => (
                      <th key={idx} className="text-right py-1 px-2">{line.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data[0]?.data.map((_, pointIdx) => (
                    <tr key={pointIdx} className="border-b border-gray-100">
                      <td className="py-1 font-medium">{data[0].data[pointIdx].x}</td>
                      {data.map((line, lineIdx) => (
                        <td 
                          key={lineIdx} 
                          className="text-right py-1 px-2 cursor-pointer hover:bg-blue-50"
                          onClick={() => {
                            setSelectedPoint({ lineIndex: lineIdx, pointIndex: pointIdx });
                            setEditValue(line.data[pointIdx].y);
                          }}
                        >
                          {line.data[pointIdx].y.toLocaleString()}
                        </td>
                      ))}
                     </tr>
                  ))}
                </tbody>
               </table>
            </div>
          </div>
        </div>

        {/* 右侧面积图 */}
        <div className="flex-1">
          <div className="relative">
            {/* Y轴标签 */}
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-sm font-medium text-gray-600">
              数值
            </div>

            {/* 图表主体 */}
            <div className="ml-8">
              <div className="relative h-80">
                <svg className="w-full h-full" viewBox="0 0 1000 300" preserveAspectRatio="none">
                  {/* 网格线 */}
                  <g className="text-gray-200">
                    {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio, index) => (
                      <line
                        key={index}
                        x1="0"
                        y1={ratio * 280 + 10}
                        x2="1000"
                        y2={ratio * 280 + 10}
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                    ))}
                  </g>

                  {/* Y轴刻度 */}
                  {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio, index) => (
                    <text
                      key={index}
                      x="-10"
                      y={ratio * 280 + 14}
                      textAnchor="end"
                      className="text-xs fill-gray-400"
                    >
                      {(maxYValue * (1 - ratio)).toFixed(0)}
                    </text>
                  ))}

                  {/* 面积区域 */}
                  {visibleData.map((line, lineIdx) => {
                    const originalIndex = data.findIndex(d => d.label === line.label);
                    const points = line.data.map((point, pointIdx) => ({
                      x: (pointIdx / (pointCount - 1)) * 1000,
                      y: stacked 
                        ? 290 - (stackedData![pointIdx][lineIdx] / maxYValue) * 280
                        : 290 - (point.y / maxYValue) * 280
                    }));

                    // 生成面积路径
                    let pathData = `M 0,290 `;
                    for (let i = 0; i < points.length; i++) {
                      pathData += `L ${points[i].x},${points[i].y} `;
                    }
                    pathData += `L 1000,290 Z`;

                    // 生成边界线路径
                    const linePath = smoothCurves 
                      ? getSmoothPath(points)
                      : points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');

                    return (
                      <g key={originalIndex}>
                        <defs>
                          <linearGradient
                            id={`area-gradient-${originalIndex}`}
                            x1="0%"
                            y1="0%"
                            x2="0%"
                            y2="100%"
                          >
                            <stop offset="0%" stopColor={line.color} stopOpacity="0.5" />
                            <stop offset="100%" stopColor={line.color} stopOpacity="0.05" />
                          </linearGradient>
                        </defs>

                        {/* 面积 */}
                        <path
                          d={pathData}
                          fill={`url(#area-gradient-${originalIndex})`}
                          className="transition-opacity duration-300 cursor-pointer"
                          style={{ opacity: selectedPoint?.lineIndex === originalIndex ? 0.9 : 0.7 }}
                        />

                        {/* 边界线 */}
                        <path
                          d={linePath}
                          fill="none"
                          stroke={line.color}
                          strokeWidth={selectedPoint?.lineIndex === originalIndex ? 3 : 2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="cursor-pointer"
                          onClick={() => setSelectedPoint({ lineIndex: originalIndex, pointIndex: 0 })}
                        />

                        {/* 数据点 */}
                        {points.map((point, pointIdx) => {
                          const isSelected = selectedPoint?.lineIndex === originalIndex && 
                                            selectedPoint?.pointIndex === pointIdx;
                          const isHovered = hoveredIndex === pointIdx;
                          
                          return (
                            <g key={pointIdx}>
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r={isSelected ? 6 : isHovered ? 5 : 3}
                                fill="white"
                                stroke={line.color}
                                strokeWidth={isSelected ? 3 : 2}
                                className="cursor-pointer transition-all duration-200"
                                onClick={() => setSelectedPoint({ lineIndex: originalIndex, pointIndex: pointIdx })}
                              />
                              
                              {/* 数值标签 */}
                              {showValues && (isSelected || isHovered) && (
                                <text
                                  x={point.x}
                                  y={point.y - 10}
                                  textAnchor="middle"
                                  className="text-xs font-medium fill-gray-700"
                                >
                                  {line.data[pointIdx].y.toFixed(0)}
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </g>
                    );
                  })}

                  {/* 悬停垂直线 */}
                  {hoveredIndex !== null && (
                    <g>
                      <line
                        x1={(hoveredIndex / (pointCount - 1)) * 1000}
                        y1="10"
                        x2={(hoveredIndex / (pointCount - 1)) * 1000}
                        y2="290"
                        stroke="#9CA3AF"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                      
                      {/* 悬停提示框 */}
                      <g transform={`translate(${(hoveredIndex / (pointCount - 1)) * 1000 - 80}, 15)`}>
                        <rect
                          x="0"
                          y="0"
                          width="160"
                          height={visibleData.length * 25 + 25}
                          rx="6"
                          fill="#1f2937"
                          className="shadow-lg"
                        />
                        <text x="80" y="18" textAnchor="middle" className="text-xs font-bold fill-white">
                          {xValues[hoveredIndex]}
                        </text>
                        {visibleData.map((line, idx) => (
                          <g key={idx}>
                            <rect x="8" y={24 + idx * 22} width="10" height="10" rx="2" fill={line.color} />
                            <text x="22" y={33 + idx * 22} className="text-[10px] fill-gray-300">
                              {line.label}
                            </text>
                            <text x="150" y={33 + idx * 22} textAnchor="end" className="text-[10px] font-bold fill-white">
                              {line.data[hoveredIndex].y.toFixed(0)}
                            </text>
                          </g>
                        ))}
                      </g>
                    </g>
                  )}
                </svg>

                {/* X轴标签 */}
                <div className="flex justify-between mt-2 px-2">
                  {xValues.map((label, index) => (
                    <div
                      key={index}
                      className="text-center text-xs text-gray-500 cursor-pointer hover:text-gray-700"
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      style={{ 
                        width: `${1000 / (pointCount - 1)}px`,
                        transform: 'translateX(-50%)'
                      }}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 图例 */}
          {showLegend && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-4 justify-center">
                {data.map((line, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${
                      selectedPoint?.lineIndex === index ? 'bg-gray-100' : 'hover:bg-gray-50'
                    } ${!line.visible ? 'opacity-40' : ''}`}
                    onClick={() => {
                      if (!line.visible) toggleVisibility(index);
                      else setSelectedPoint({ lineIndex: index, pointIndex: 0 });
                    }}
                  >
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: line.color }}
                    />
                    <span className="text-sm text-gray-600">{line.label}</span>
                    {hoveredIndex !== null && (
                      <span className="text-sm font-medium text-gray-800 ml-2">
                        {line.data[hoveredIndex]?.y.toLocaleString()}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVisibility(index);
                      }}
                      className="text-xs text-gray-400"
                    >
                      {line.visible ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                ))}
              </div>

              {/* 提示信息 */}
              <div className="mt-4 text-xs text-gray-400 text-center">
                {stacked ? '堆叠模式' : '分组模式'} • 
                点击线条/点选中 • 悬停查看详情 • 在左侧面板修改数值
              </div>
            </div>
          )}
        </div>
      </div>
    </ChartContainer>
  );
};

export default AreaChart;