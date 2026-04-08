// components/RadarChart.tsx
import React, { useState } from 'react';
import ChartContainer from './ChartContainer';

interface RadarChartData {
  label: string;
  color: string;
  values: number[];
  fillOpacity?: number;
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
  data,
  dimensions,
  title,
  maxValue = 100,
  showGrid = true,
  showPoints = true,
  showLegend = true
}) => {
  const [hoveredDataset, setHoveredDataset] = useState<number | null>(null);
  const [hoveredDimension, setHoveredDimension] = useState<number | null>(null);
  
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

  return (
    <ChartContainer title={title}>
      <div className="relative">
        {/* 图表主体 */}
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

            {/* 数据多边形 */}
            {data.map((dataset, datasetIndex) => {
              const isHovered = hoveredDataset === datasetIndex;
              const fillOpacity = dataset.fillOpacity || 0.2;
              
              return (
                <g key={datasetIndex}>
                  {/* 填充区域 */}
                  <polygon
                    points={calculatePolygonPoints(dataset.values)}
                    fill={dataset.color}
                    fillOpacity={isHovered ? fillOpacity * 1.5 : fillOpacity}
                    stroke={dataset.color}
                    strokeWidth={isHovered ? 3 : 2}
                    strokeOpacity="0.8"
                    className="transition-all duration-300"
                    onMouseEnter={() => setHoveredDataset(datasetIndex)}
                    onMouseLeave={() => setHoveredDataset(null)}
                  />

                  {/* 数据点 */}
                  {showPoints && dataset.values.map((value, valueIndex) => {
                    const angle = (valueIndex * 2 * Math.PI) / dimensionCount - Math.PI / 2;
                    const distance = (value / maxValue) * radius;
                    const x = centerX + distance * Math.cos(angle);
                    const y = centerY + distance * Math.sin(angle);
                    
                    return (
                      <circle
                        key={valueIndex}
                        cx={x}
                        cy={y}
                        r={isHovered ? 5 : 4}
                        fill="white"
                        stroke={dataset.color}
                        strokeWidth={isHovered ? 3 : 2}
                        className="transition-all duration-200"
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* 维度标签 */}
            {dimensionPoints.map((point, index) => {
              const isHovered = hoveredDimension === index;
              const labelX = point.x + (point.x - centerX) * 0.15;
              const labelY = point.y + (point.y - centerY) * 0.15;
              
              return (
                <g key={index}>
                  {/* 维度端点 */}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={isHovered ? 4 : 3}
                    fill="#6B7280"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredDimension(index)}
                    onMouseLeave={() => setHoveredDimension(null)}
                  />
                  
                  {/* 维度标签 */}
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    className={`text-sm ${isHovered ? 'font-bold text-gray-800' : 'text-gray-600'}`}
                    onMouseEnter={() => setHoveredDimension(index)}
                    onMouseLeave={() => setHoveredDimension(null)}
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

            {/* 悬停提示 */}
            {hoveredDataset !== null && (
              <g>
                {/* 显示当前数据集的数值 */}
                {data[hoveredDataset].values.map((value, index) => {
                  const angle = (index * 2 * Math.PI) / dimensionCount - Math.PI / 2;
                  const distance = (value / maxValue) * radius;
                  const x = centerX + distance * Math.cos(angle);
                  const y = centerY + distance * Math.sin(angle);
                  
                  return (
                    <g key={index}>
                      <rect
                        x={x - 25}
                        y={y - 35}
                        width="50"
                        height="25"
                        rx="4"
                        fill="#1F2937"
                        className="shadow-lg"
                      />
                      <text
                        x={x}
                        y={y - 20}
                        textAnchor="middle"
                        className="text-xs fill-white"
                      >
                        {value.toFixed(1)}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}
          </svg>
        </div>

        {/* 刻度标签 */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">最大值</div>
            <div className="text-lg font-bold text-gray-700">{maxValue}</div>
          </div>
        </div>

        {/* 网格刻度 */}
        <div className="absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 text-xs text-gray-400">
          75%
        </div>
        <div className="absolute left-1/2 top-3/8 -translate-x-1/2 -translate-y-1/2 text-xs text-gray-400">
          50%
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-gray-400">
          25%
        </div>
      </div>

      {/* 图例 */}
      {showLegend && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-4 justify-center">
            {data.map((dataset, index) => {
              const isHovered = hoveredDataset === index;
              
              return (
                <div
                  key={index}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
                    isHovered ? 'bg-gray-100' : ''
                  }`}
                  onMouseEnter={() => setHoveredDataset(index)}
                  onMouseLeave={() => setHoveredDataset(null)}
                >
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
                  <span className={`text-sm ${isHovered ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                    {dataset.label}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({dataset.values.length}个维度)
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
        {hoveredDataset !== null && (
          <span className="ml-4 font-medium text-gray-700">
            当前: {data[hoveredDataset].label} - 平均分: {
              (data[hoveredDataset].values.reduce((a, b) => a + b, 0) / dimensionCount).toFixed(1)
            }
          </span>
        )}
      </div>
    </ChartContainer>
  );
};

export default RadarChart;
