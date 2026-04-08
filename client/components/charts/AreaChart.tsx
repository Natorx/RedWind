// components/AreaChart.tsx
import React, { useState } from 'react';
import ChartContainer from './ChartContainer';

interface AreaChartData {
  label: string;
  color: string;
  data: {
    x: string;
    y: number;
  }[];
}

interface AreaChartProps {
  data: AreaChartData[];
  title: string;
  stacked?: boolean;
  showLegend?: boolean;
}

const AreaChart: React.FC<AreaChartProps> = ({
  data,
  title,
  stacked = false,
  showLegend = true
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  // 计算数据范围
  const xValues = data[0]?.data.map(point => point.x) || [];
  const pointCount = xValues.length;
  
  // 如果是堆叠图，计算累计值
  const calculateStackedData = () => {
    const result: number[][] = [];
    for (let i = 0; i < pointCount; i++) {
      const pointValues = data.map(line => line.data[i].y);
      const cumulative = [];
      let sum = 0;
      for (const value of pointValues) {
        sum += value;
        cumulative.push(sum);
      }
      result.push(cumulative);
    }
    return result;
  };

  const stackedData = stacked ? calculateStackedData() : null;

  return (
    <ChartContainer title={title}>
      <div className="relative">
        {/* 图表主体 */}
        <div className="h-64">
          <svg className="w-full h-full" viewBox="0 0 1000 300">
            {/* 网格线 */}
            <g className="text-gray-200">
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
                <line
                  key={index}
                  x1="50"
                  y1={50 + ratio * 200}
                  x2="950"
                  y2={50 + ratio * 200}
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              ))}
            </g>

            {/* 面积区域 */}
            {data.map((line, lineIndex) => {
              const points = line.data.map((point, pointIndex) => ({
                x: (pointIndex / (pointCount - 1)) * 900 + 50,
                y: stacked 
                  ? 250 - (stackedData![pointIndex][lineIndex] / Math.max(...stackedData!.flat())) * 200
                  : 250 - (point.y / Math.max(...data.flatMap(l => l.data.map(p => p.y)))) * 200
              }));

              // 生成面积路径
              let pathData = `M ${points[0].x},250 `;
              for (let i = 0; i < points.length; i++) {
                pathData += `L ${points[i].x},${points[i].y} `;
              }
              pathData += `L ${points[points.length-1].x},250 Z`;

              return (
                <g key={lineIndex}>
                  {/* 渐变填充 */}
                  <defs>
                    <linearGradient
                      id={`area-gradient-${lineIndex}`}
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor={line.color} stopOpacity="0.4" />
                      <stop offset="100%" stopColor={line.color} stopOpacity="0.1" />
                    </linearGradient>
                  </defs>

                  {/* 面积 */}
                  <path
                    d={pathData}
                    fill={`url(#area-gradient-${lineIndex})`}
                    className="transition-opacity duration-300 hover:opacity-80"
                  />

                  {/* 边界线 */}
                  <path
                    d={`M ${points[0].x},${points[0].y} ${points.map(p => `L ${p.x},${p.y}`).join(' ')}`}
                    fill="none"
                    stroke={line.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}

            {/* 悬停线 */}
            {hoveredIndex !== null && (
              <g>
                <line
                  x1={(hoveredIndex / (pointCount - 1)) * 900 + 50}
                  y1="50"
                  x2={(hoveredIndex / (pointCount - 1)) * 900 + 50}
                  y2="250"
                  stroke="#4B5563"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                
                {/* 悬停点 */}
                {data.map((line, lineIndex) => {
                  const point = line.data[hoveredIndex];
                  const x = (hoveredIndex / (pointCount - 1)) * 900 + 50;
                  const y = stacked 
                    ? 250 - (stackedData![hoveredIndex][lineIndex] / Math.max(...stackedData!.flat())) * 200
                    : 250 - (point.y / Math.max(...data.flatMap(l => l.data.map(p => p.y)))) * 200;
                  
                  return (
                    <g key={lineIndex}>
                      <circle
                        cx={x}
                        cy={y}
                        r="4"
                        fill="white"
                        stroke={line.color}
                        strokeWidth="2"
                      />
                    </g>
                  );
                })}
              </g>
            )}
          </svg>
        </div>

        {/* X轴标签 */}
        <div className="flex justify-between mt-2 px-4">
          {xValues.map((label, index) => (
            <div
              key={index}
              className="text-center text-xs text-gray-500 cursor-pointer hover:text-gray-700"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ 
                width: `${900 / (pointCount - 1)}px`,
                transform: 'translateX(-50%)'
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* 图例 */}
      {showLegend && (
        <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-gray-200">
          {data.map((line, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: line.color }}
              />
              <span className="text-sm text-gray-600">{line.label}</span>
              {hoveredIndex !== null && (
                <span className="text-sm font-medium text-gray-800 ml-2">
                  {line.data[hoveredIndex].y.toLocaleString()}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </ChartContainer>
  );
};

export default AreaChart;
