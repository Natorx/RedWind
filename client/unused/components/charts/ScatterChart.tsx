// components/ScatterChart.tsx
import React, { useState } from 'react';
import ChartContainer from './ChartContainer';

interface ScatterPoint {
  x: number;
  y: number;
  label?: string;
  size?: number;
}

interface ScatterChartData {
  label: string;
  color: string;
  points: ScatterPoint[];
  visible?: boolean;
}

interface ScatterChartProps {
  data: ScatterChartData[];
  title: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  xAxisRange?: [number, number];
  yAxisRange?: [number, number];
  showRegressionLine?: boolean;
  showPointLabels?: boolean;
}

const ScatterChart: React.FC<ScatterChartProps> = ({
  data: initialData,
  title,
  xAxisLabel = 'X轴',
  yAxisLabel = 'Y轴',
  xAxisRange,
  yAxisRange,
  showRegressionLine = false,
  showPointLabels = true
}) => {
  const [data, setData] = useState(initialData.map(d => ({ ...d, visible: d.visible !== false })));
  const [hoveredPoint, setHoveredPoint] = useState<{
    datasetIndex: number;
    pointIndex: number;
  } | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<{
    datasetIndex: number;
    pointIndex: number;
  } | null>(null);

  // 计算数据范围
  const allPoints = data.flatMap(dataset => dataset.points);
  const minX = xAxisRange ? xAxisRange[0] : Math.min(...allPoints.map(p => p.x));
  const maxX = xAxisRange ? xAxisRange[1] : Math.max(...allPoints.map(p => p.x));
  const minY = yAxisRange ? yAxisRange[0] : Math.min(...allPoints.map(p => p.y));
  const maxY = yAxisRange ? yAxisRange[1] : Math.max(...allPoints.map(p => p.y));
  const xRange = maxX - minX;
  const yRange = maxY - minY;

  // 计算线性回归（只基于可见的数据集）
  const calculateRegressionLine = () => {
    const visiblePoints = data
      .filter(d => d.visible)
      .flatMap(dataset => dataset.points);
    const n = visiblePoints.length;
    if (n === 0) return null;
    
    const sumX = visiblePoints.reduce((sum, p) => sum + p.x, 0);
    const sumY = visiblePoints.reduce((sum, p) => sum + p.y, 0);
    const sumXY = visiblePoints.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = visiblePoints.reduce((sum, p) => sum + p.x * p.x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
  };

  const regressionLine = showRegressionLine ? calculateRegressionLine() : null;

  // 更新点坐标
  const updatePoint = (datasetIndex: number, pointIndex: number, field: 'x' | 'y', value: number) => {
    const newData = [...data];
    newData[datasetIndex].points[pointIndex][field] = value;
    setData(newData);
  };

  // 添加新点
  const addPoint = (datasetIndex: number) => {
    const newData = [...data];
    const avgX = (minX + maxX) / 2;
    const avgY = (minY + maxY) / 2;
    newData[datasetIndex].points.push({
      x: avgX,
      y: avgY,
      label: `点 ${newData[datasetIndex].points.length + 1}`
    });
    setData(newData);
  };

  // 删除点
  const deletePoint = (datasetIndex: number, pointIndex: number) => {
    const newData = [...data];
    newData[datasetIndex].points.splice(pointIndex, 1);
    setData(newData);
    if (selectedPoint?.datasetIndex === datasetIndex && selectedPoint?.pointIndex === pointIndex) {
      setSelectedPoint(null);
    }
  };

  // 切换数据集可见性
  const toggleVisibility = (datasetIndex: number) => {
    const newData = [...data];
    newData[datasetIndex].visible = !newData[datasetIndex].visible;
    setData(newData);
  };

  const visibleData = data.filter(d => d.visible);

  return (
    <ChartContainer title={title}>
      <div className="flex gap-6">
        {/* 左侧控制面板 */}
        <div className="w-96 flex-shrink-0 overflow-y-auto max-h-[600px] pr-4">
          <div className="sticky top-0 bg-white pb-4 mb-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">控制面板</h3>
            <div className="text-xs text-gray-500">
              共 {allPoints.length} 个数据点 • {data.length} 个数据集
            </div>
          </div>

          {data.map((dataset, datasetIndex) => (
            <div key={datasetIndex} className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: dataset.color }}
                  />
                  <span className="font-medium text-gray-800">{dataset.label}</span>
                  <span className="text-xs text-gray-400">
                    ({dataset.points.length}个点)
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => addPoint(datasetIndex)}
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                  >
                    + 添加点
                  </button>
                  <button
                    onClick={() => toggleVisibility(datasetIndex)}
                    className="px-2 py-1 text-xs bg-white rounded-md shadow-sm hover:shadow transition-shadow"
                  >
                  </button>
                </div>
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {dataset.points.map((point, pointIndex) => {
                  const isSelected = selectedPoint?.datasetIndex === datasetIndex && 
                                    selectedPoint?.pointIndex === pointIndex;
                  
                  return (
                    <div 
                      key={pointIndex} 
                      className={`p-2 rounded-md ${isSelected ? 'bg-blue-50 ring-1 ring-blue-300' : 'bg-white'}`}
                      onClick={() => setSelectedPoint({ datasetIndex, pointIndex })}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {point.label || `点 ${pointIndex + 1}`}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePoint(datasetIndex, pointIndex);
                          }}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          删除
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500">X值</label>
                          <input
                            type="number"
                            value={point.x.toFixed(1)}
                            onChange={(e) => updatePoint(datasetIndex, pointIndex, 'x', parseFloat(e.target.value))}
                            className="w-full px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            step="1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Y值</label>
                          <input
                            type="number"
                            value={point.y.toFixed(1)}
                            onChange={(e) => updatePoint(datasetIndex, pointIndex, 'y', parseFloat(e.target.value))}
                            className="w-full px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            step="1"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-3 pt-2 text-xs text-gray-500">
                中心点: ({(dataset.points.reduce((a, b) => a + b.x, 0) / dataset.points.length).toFixed(1)}, 
                {(dataset.points.reduce((a, b) => a + b.y, 0) / dataset.points.length).toFixed(1)})
              </div>
            </div>
          ))}
        </div>

        {/* 右侧散点图 */}
        <div className="flex-1">
          <div className="relative">
            {/* 坐标轴标签 */}
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-sm font-medium text-gray-600">
              {yAxisLabel}
            </div>
            <div className="absolute left-12 right-0 -bottom-6 text-center text-sm font-medium text-gray-600">
              {xAxisLabel}
            </div>

            {/* 图表主体 */}
            <div className="ml-8 mb-6">
              <div className="relative h-80 bg-white border border-gray-200 rounded-lg">
                {/* 网格线 */}
                {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio, index) => (
                  <div
                    key={`h-${index}`}
                    className="absolute left-0 right-0 border-t border-gray-100"
                    style={{ top: `${(1 - ratio) * 100}%` }}
                  />
                ))}
                {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio, index) => (
                  <div
                    key={`v-${index}`}
                    className="absolute top-0 bottom-0 border-l border-gray-100"
                    style={{ left: `${ratio * 100}%` }}
                  />
                ))}

                {/* 散点图 SVG */}
                <svg className="w-full h-full" viewBox="0 0 1000 300" preserveAspectRatio="none">
                  {/* 回归线 */}
                  {regressionLine && (
                    <line
                      x1="0"
                      y1={300 - ((regressionLine.slope * minX + regressionLine.intercept - minY) / yRange) * 300}
                      x2="1000"
                      y2={300 - ((regressionLine.slope * maxX + regressionLine.intercept - minY) / yRange) * 300}
                      stroke="#9CA3AF"
                      strokeWidth="2"
                      strokeDasharray="6 4"
                    />
                  )}

                  {/* 数据点 */}
                  {visibleData.map((dataset) => {
                    const originalIndex = data.findIndex(d => d.label === dataset.label);
                    return dataset.points.map((point, pointIndex) => {
                      const x = ((point.x - minX) / xRange) * 1000;
                      const y = 300 - ((point.y - minY) / yRange) * 300;
                      const size = point.size || 8;
                      const isHovered = hoveredPoint?.datasetIndex === originalIndex && 
                                       hoveredPoint?.pointIndex === pointIndex;
                      const isSelected = selectedPoint?.datasetIndex === originalIndex && 
                                       selectedPoint?.pointIndex === pointIndex;
                      
                      return (
                        <g key={`${originalIndex}-${pointIndex}`}>
                          {/* 散点 */}
                          <circle
                            cx={x}
                            cy={y}
                            r={isHovered || isSelected ? size + 3 : size}
                            fill={dataset.color}
                            fillOpacity="0.8"
                            stroke="white"
                            strokeWidth={isHovered || isSelected ? 3 : 2}
                            className="cursor-pointer transition-all duration-200"
                            onMouseEnter={() => setHoveredPoint({
                              datasetIndex: originalIndex,
                              pointIndex
                            })}
                            onMouseLeave={() => setHoveredPoint(null)}
                            onClick={() => setSelectedPoint({ datasetIndex: originalIndex, pointIndex })}
                          />
                          
                          {/* 数据点标签 */}
                          {showPointLabels && (isHovered || isSelected) && (
                            <g>
                              <rect
                                x={x - 55}
                                y={y - 45}
                                width="110"
                                height="40"
                                rx="4"
                                fill="#1f2937"
                                className="shadow-lg"
                              />
                              <text
                                x={x}
                                y={y - 25}
                                textAnchor="middle"
                                className="text-xs fill-white"
                              >
                                {point.label || `点 ${pointIndex + 1}`}
                              </text>
                              <text
                                x={x}
                                y={y - 12}
                                textAnchor="middle"
                                className="text-xs fill-gray-300"
                              >
                                ({point.x.toFixed(1)}, {point.y.toFixed(1)})
                              </text>
                            </g>
                          )}
                          
                          {/* 始终显示的点标签 */}
                          {showPointLabels && !isHovered && !isSelected && point.label && (
                            <text
                              x={x}
                              y={y - size - 2}
                              textAnchor="middle"
                              className="text-[10px] fill-gray-500"
                            >
                              {point.label}
                            </text>
                          )}
                        </g>
                      );
                    });
                  })}
                </svg>
              </div>

              {/* X轴刻度 */}
              <div className="flex justify-between mt-2 px-4">
                {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio, index) => (
                  <div
                    key={index}
                    className="text-xs text-gray-500 -translate-x-2"
                  >
                    {(minX + ratio * xRange).toFixed(1)}
                  </div>
                ))}
              </div>
            </div>

            {/* Y轴刻度 */}
            <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between">
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio, index) => (
                <div
                  key={index}
                  className="text-xs text-gray-500 -translate-x-full pr-2"
                  style={{ marginTop: '-0.5rem' }}
                >
                  {(minY + (1 - ratio) * yRange).toFixed(1)}
                </div>
              ))}
            </div>
          </div>

          {/* 图例和统计信息 */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap justify-between items-center">
              {/* 图例 - 可点击切换 */}
              <div className="flex flex-wrap gap-4">
                {data.map((dataset, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${
                      dataset.visible ? 'hover:bg-gray-50' : 'opacity-50'
                    }`}
                    onClick={() => toggleVisibility(index)}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: dataset.color }}
                    />
                    <span className="text-sm text-gray-600">{dataset.label}</span>
                    <span className="text-xs text-gray-400">
                      ({dataset.points.length}个点)
                    </span>
                    <span className="text-xs">
                    </span>
                  </div>
                ))}
              </div>

              {/* 统计信息 */}
              <div className="text-sm text-gray-500">
                总计: {allPoints.length}个数据点
                {regressionLine && (
                  <span className="ml-4 text-xs">
                    回归线: y = {regressionLine.slope.toFixed(2)}x + {regressionLine.intercept.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* 选中点的详细信息 */}
            {selectedPoint && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-blue-800">
                      当前选中: {data[selectedPoint.datasetIndex]?.label} - 
                      {data[selectedPoint.datasetIndex]?.points[selectedPoint.pointIndex]?.label || `点 ${selectedPoint.pointIndex + 1}`}
                    </span>
                    <span className="text-sm text-blue-600 ml-2">
                      ({data[selectedPoint.datasetIndex]?.points[selectedPoint.pointIndex]?.x.toFixed(1)}, 
                      {data[selectedPoint.datasetIndex]?.points[selectedPoint.pointIndex]?.y.toFixed(1)})
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedPoint(null)}
                    className="text-xs text-blue-600 hover:text-blue-800"
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

export default ScatterChart;