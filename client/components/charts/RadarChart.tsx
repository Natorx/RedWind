// components/RadarChart.tsx
import React, { useState } from 'react';
import ChartContainer from './ChartContainer';

interface RadarChartData {
  label: string;
  color: string;
  values: number[];
  fillOpacity?: number;
  visible?: boolean;
}

interface RadarChartProps {
  data: RadarChartData[];
  dimensions: string[];
  title: string;
  maxValue?: number;
  showGrid?: boolean;
  showPoints?: boolean;
  showLegend?: boolean;
}

const RadarChart: React.FC<RadarChartProps> = ({
  data: initialData,
  dimensions,
  title,
  maxValue = 100,
  showGrid = true,
  showPoints = true,
  showLegend = true
}) => {
  const [data, setData] = useState(initialData.map(d => ({ ...d, visible: d.visible !== false })));
  const [hoveredDataset, setHoveredDataset] = useState<number | null>(null);
  
  const dimensionCount = dimensions.length;
  const centerX = 200;
  const centerY = 200;
  const radius = 150;

  // 计算多边形顶点
  const calculatePolygonPoints = (values: number[]) => {
    return values.map((value, index) => {
      const angle = (index * 2 * Math.PI) / dimensionCount - Math.PI / 2;
      const distance = (value / maxValue) * radius;
      const x = centerX + distance * Math.cos(angle);
      const y = centerY + distance * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
  };

  // 计算网格点
  const calculateGridPoints = (level: number) => {
    const gridRadius = (level / 5) * radius;
    return Array.from({ length: dimensionCount + 1 }).map((_, index) => {
      const angle = (index * 2 * Math.PI) / dimensionCount - Math.PI / 2;
      const x = centerX + gridRadius * Math.cos(angle);
      const y = centerY + gridRadius * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
  };

  // 计算维度轴点
  const calculateDimensionPoints = () => {
    return dimensions.map((_, index) => {
      const angle = (index * 2 * Math.PI) / dimensionCount - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      return { x, y, angle };
    });
  };

  const dimensionPoints = calculateDimensionPoints();

  // 更新特定数据集的某个维度值
  const updateValue = (datasetIndex: number, dimensionIndex: number, newValue: number) => {
    const newData = [...data];
    newData[datasetIndex].values[dimensionIndex] = Math.min(maxValue, Math.max(0, newValue));
    setData(newData);
  };

  // 切换数据集可见性
  const toggleVisibility = (datasetIndex: number) => {
    const newData = [...data];
    newData[datasetIndex].visible = !newData[datasetIndex].visible;
    setData(newData);
  };

  // 重置所有数据
  const resetAll = () => {
    setData(initialData.map(d => ({ ...d, visible: d.visible !== false })));
  };

  // 设置所有数据为最大值
  const setAllMax = () => {
    const newData = data.map(dataset => ({
      ...dataset,
      values: dataset.values.map(() => maxValue)
    }));
    setData(newData);
  };

  // 设置所有数据为平均值
  const setAllAverage = () => {
    const newData = data.map(dataset => ({
      ...dataset,
      values: dataset.values.map(() => maxValue / 2)
    }));
    setData(newData);
  };

  const visibleData = data.filter(d => d.visible);

  return (
    <ChartContainer title={title}>
      <div className="flex gap-6">
        {/* 左侧控制面板 */}
        <div className="w-80 flex-shrink-0 overflow-y-auto max-h-[600px] pr-4">
          <div className="sticky top-0 bg-white pb-4 mb-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">控制面板</h3>
            <div className="flex gap-2">
              <button
                onClick={resetAll}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                重置
              </button>
              <button
                onClick={setAllMax}
                className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              >
                全部最大
              </button>
              <button
                onClick={setAllAverage}
                className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
              >
                全部平均
              </button>
            </div>
          </div>

          {data.map((dataset, datasetIndex) => (
            <div key={datasetIndex} className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ 
                      backgroundColor: dataset.color,
                      opacity: dataset.fillOpacity || 0.2
                    }}
                  />
                  <div
                    className="w-3 h-0.5"
                    style={{ backgroundColor: dataset.color }}
                  />
                  <span className="font-medium text-gray-800">{dataset.label}</span>
                </div>
                <button
                  onClick={() => toggleVisibility(datasetIndex)}
                  className="px-2 py-1 text-xs bg-white rounded-md shadow-sm hover:shadow transition-shadow"
                >

                </button>
              </div>
              
              <div className="space-y-2">
                {dimensions.map((dimension, dimIndex) => (
                  <div key={dimIndex} className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 w-20 flex-shrink-0">{dimension}</span>
                    <input
                      type="range"
                      min="0"
                      max={maxValue}
                      value={dataset.values[dimIndex]}
                      onChange={(e) => updateValue(datasetIndex, dimIndex, Number(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, ${dataset.color} 0%, ${dataset.color} ${(dataset.values[dimIndex] / maxValue) * 100}%, #E5E7EB ${(dataset.values[dimIndex] / maxValue) * 100}%, #E5E7EB 100%)`
                      }}
                    />
                    <span className="text-sm font-mono w-12 text-right">
                      {dataset.values[dimIndex].toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 pt-2 text-xs text-gray-500">
                平均分: {(dataset.values.reduce((a, b) => a + b, 0) / dimensionCount).toFixed(1)}
              </div>
            </div>
          ))}
        </div>

        {/* 右侧雷达图 */}
        <div className="flex-1">
          <div className="relative">
            <div className="h-96 flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 400 400">
                {/* 背景网格 */}
                {showGrid && (
                  <g className="text-gray-100">
                    {/* 同心圆网格 */}
                    {[1, 2, 3, 4].map((level) => (
                      <polygon
                        key={`grid-${level}`}
                        points={calculateGridPoints(level)}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                      />
                    ))}
                    
                    {/* 维度轴 */}
                    {dimensionPoints.map((point, index) => (
                      <line
                        key={`axis-${index}`}
                        x1={centerX}
                        y1={centerY}
                        x2={point.x}
                        y2={point.y}
                        stroke="#E5E7EB"
                        strokeWidth="1"
                      />
                    ))}
                  </g>
                )}

                {/* 数据多边形 - 只显示可见的 */}
                {visibleData.map((dataset) => {
                  const originalIndex = data.findIndex(d => d.label === dataset.label);
                  const isHovered = hoveredDataset === originalIndex;
                  const fillOpacity = dataset.fillOpacity || 0.2;
                  
                  return (
                    <g key={originalIndex}>
                      {/* 填充区域 */}
                      <polygon
                        points={calculatePolygonPoints(dataset.values)}
                        fill={dataset.color}
                        fillOpacity={isHovered ? fillOpacity * 1.5 : fillOpacity}
                        stroke={dataset.color}
                        strokeWidth={isHovered ? 3 : 2}
                        strokeOpacity="0.8"
                        className="transition-all duration-300"
                        onMouseEnter={() => setHoveredDataset(originalIndex)}
                        onMouseLeave={() => setHoveredDataset(null)}
                      />

                      {/* 数据点及数值标签 */}
                      {showPoints && dataset.values.map((value, valueIndex) => {
                        const angle = (valueIndex * 2 * Math.PI) / dimensionCount - Math.PI / 2;
                        const distance = (value / maxValue) * radius;
                        const x = centerX + distance * Math.cos(angle);
                        const y = centerY + distance * Math.sin(angle);
                        const labelX = x + (x - centerX) * 0.2;
                        const labelY = y + (y - centerY) * 0.2 - 10;
                        
                        return (
                          <g key={valueIndex}>
                            <circle
                              cx={x}
                              cy={y}
                              r={isHovered ? 5 : 4}
                              fill="white"
                              stroke={dataset.color}
                              strokeWidth={isHovered ? 3 : 2}
                              className="transition-all duration-200"
                            />
                            {/* 数值标签 */}
                            <text
                              x={labelX}
                              y={labelY}
                              textAnchor="middle"
                              className="text-xs font-medium"
                              fill={dataset.color}
                            >
                              {value.toFixed(0)}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })}

                {/* 维度标签及数值 */}
                {dimensionPoints.map((point, index) => {
                  const labelX = point.x + (point.x - centerX) * 0.15;
                  const labelY = point.y + (point.y - centerY) * 0.15;
                  
                  return (
                    <g key={index}>
                      {/* 维度端点 */}
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={3}
                        fill="#6B7280"
                      />
                      
                      {/* 维度标签 */}
                      <text
                        x={labelX}
                        y={labelY}
                        textAnchor="middle"
                        className="text-sm font-medium text-gray-700"
                      >
                        {dimensions[index]}
                      </text>
                    </g>
                  );
                })}

                {/* 中心点 */}
                <circle
                  cx={centerX}
                  cy={centerY}
                  r="3"
                  fill="#4B5563"
                />
              </svg>
            </div>

            {/* 刻度标签 */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">最大值</div>
                <div className="text-sm font-bold text-gray-600">{maxValue}</div>
              </div>
            </div>
          </div>

          {/* 图例 - 可点击切换 */}
          {showLegend && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-4 justify-center">
                {data.map((dataset, index) => {
                  const isHovered = hoveredDataset === index;
                  const isVisible = dataset.visible;
                  
                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        isHovered ? 'bg-gray-100' : ''
                      } ${!isVisible ? 'opacity-50' : ''}`}
                      onMouseEnter={() => setHoveredDataset(index)}
                      onMouseLeave={() => setHoveredDataset(null)}
                      onClick={() => toggleVisibility(index)}
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{ 
                          backgroundColor: isVisible ? dataset.color : '#9CA3AF',
                          opacity: dataset.fillOpacity || 0.2
                        }}
                      />
                      <div
                        className="w-3 h-0.5"
                        style={{ backgroundColor: isVisible ? dataset.color : '#9CA3AF' }}
                      />
                      <span className={`text-sm ${isHovered ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                        {dataset.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({dataset.values.reduce((a, b) => a + b, 0).toFixed(0)})
                      </span>
                      <span className="text-xs">

                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 统计信息 */}
          <div className="mt-4 text-sm text-gray-500 text-center">
            共 {dimensionCount} 个评估维度 • {data.length} 个数据集
            {hoveredDataset !== null && data[hoveredDataset] && (
              <span className="ml-4 font-medium text-gray-700">
                当前: {data[hoveredDataset].label} - 平均分: {
                  (data[hoveredDataset].values.reduce((a, b) => a + b, 0) / dimensionCount).toFixed(1)
                }
              </span>
            )}
          </div>
        </div>
      </div>
    </ChartContainer>
  );
};

export default RadarChart;