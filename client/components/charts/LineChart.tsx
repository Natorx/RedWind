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
}

interface DualAxisLineChartProps {
  data: DualAxisLineData[];
  title: string;
  xAxisLabel?: string;
  leftAxisLabel?: string;
  rightAxisLabel?: string;
}

const DualAxisLineChart: React.FC<DualAxisLineChartProps> = ({
  data,
  title,
  leftAxisLabel = '左轴',
  rightAxisLabel = '右轴'
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    lineIndex: number;
    pointIndex: number;
  } | null>(null);

  // 分离左右轴数据
  const leftAxisData = data.filter(item => item.axis === 'left');
  const rightAxisData = data.filter(item => item.axis === 'right');

  // 计算左右轴的数据范围
  const leftValues = leftAxisData.flatMap(line => line.data.map(point => point.y));
  const rightValues = rightAxisData.flatMap(line => line.data.map(point => point.y));
  
  const leftMin = leftValues.length > 0 ? Math.min(...leftValues) : 0;
  const leftMax = leftValues.length > 0 ? Math.max(...leftValues) : 100;
  const rightMin = rightValues.length > 0 ? Math.min(...rightValues) : 0;
  const rightMax = rightValues.length > 0 ? Math.max(...rightValues) : 100;
  
  const leftRange = leftMax - leftMin;
  const rightRange = rightMax - rightMin;

  // 假设所有线有相同的x轴数据点
  const xValues = data[0]?.data.map(point => point.x) || [];
  const pointCount = xValues.length;

  return (
    <ChartContainer title={title}>
      <div className="relative">
        {/* 左Y轴标签 */}
        <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center">
          <div className="-rotate-90 whitespace-nowrap text-sm text-gray-500">
            {leftAxisLabel}
          </div>
        </div>

        {/* 右Y轴标签 */}
        <div className="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center">
          <div className="rotate-90 whitespace-nowrap text-sm text-gray-500">
            {rightAxisLabel}
          </div>
        </div>

        {/* 图表主体 */}
        <div className="ml-12 mr-12">
          {/* 左Y轴网格 */}
          <div className="absolute left-12 right-12 top-0 bottom-12">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
              <div
                key={`left-${index}`}
                className="absolute left-0 right-0 border-t border-gray-200"
                style={{ top: `${(1 - ratio) * 100}%` }}
              >
                <div className="absolute -left-10 -translate-y-1/2 text-sm text-gray-400">
                  {Math.round(leftMin + ratio * leftRange).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* 右Y轴网格 */}
          <div className="absolute left-12 right-12 top-0 bottom-12">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
              <div
                key={`right-${index}`}
                className="absolute left-0 right-0 border-t border-gray-200 border-dashed"
                style={{ top: `${(1 - ratio) * 100}%` }}
              >
                <div className="absolute -right-10 -translate-y-1/2 text-sm text-gray-400">
                  {Math.round(rightMin + ratio * rightRange).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* 折线图 */}
          <div className="relative h-64 mt-8">
            <svg className="w-full h-full" viewBox="0 0 1000 300">
              {data.map((line, lineIndex) => {
                // 根据轴选择数据范围
                const isLeftAxis = line.axis === 'left';
                const minY = isLeftAxis ? leftMin : rightMin;
                const range = isLeftAxis ? leftRange : rightRange;

                // 转换坐标为SVG坐标
                const points = line.data.map((point, pointIndex) => ({
                  x: (pointIndex / (pointCount - 1)) * 900 + 50,
                  y: 250 - ((point.y - minY) / range) * 200
                }));

                // 生成路径
                let pathData = `M ${points[0].x},${points[0].y}`;
                for (let i = 1; i < points.length; i++) {
                  pathData += ` L ${points[i].x},${points[i].y}`;
                }

                return (
                  <g key={lineIndex}>
                    {/* 折线 */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={line.color}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={isLeftAxis ? "none" : "5,5"}
                      className="transition-all duration-300"
                    />

                    {/* 数据点 */}
                    {points.map((point, pointIndex) => {
                      const isHovered = hoveredPoint?.lineIndex === lineIndex && 
                                       hoveredPoint?.pointIndex === pointIndex;
                      
                      return (
                        <g key={pointIndex}>
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r={isHovered ? 6 : 4}
                            fill="white"
                            stroke={line.color}
                            strokeWidth={isHovered ? 3 : 2}
                            className="cursor-pointer transition-all duration-200"
                            onMouseEnter={() => setHoveredPoint({
                              lineIndex,
                              pointIndex
                            })}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                          
                          {/* 悬停提示 */}
                          {isHovered && (
                            <g>
                              <rect
                                x={point.x - 50}
                                y={point.y - 70}
                                width="100"
                                height="50"
                                rx="6"
                                fill="#1f2937"
                                className="shadow-lg"
                              />
                              <text
                                x={point.x}
                                y={point.y - 50}
                                textAnchor="middle"
                                className="text-xs fill-white"
                              >
                                {line.data[pointIndex].x}
                              </text>
                              <text
                                x={point.x}
                                y={point.y - 35}
                                textAnchor="middle"
                                className="text-sm font-bold fill-white"
                              >
                                {line.data[pointIndex].y.toLocaleString()}
                                {line.unit && ` ${line.unit}`}
                              </text>
                              <text
                                x={point.x}
                                y={point.y - 20}
                                textAnchor="middle"
                                className="text-xs fill-gray-300"
                              >
                                {line.label} ({line.axis === 'left' ? '左轴' : '右轴'})
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
          </div>

          {/* X轴标签 */}
          <div className="flex justify-between mt-4 px-12">
            {xValues.map((label, index) => (
              <div
                key={index}
                className="text-center text-sm text-gray-600"
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
      </div>

      {/* 图例 */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-6">
          {/* 左轴图例 */}
          {leftAxisData.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-500 mb-2">{leftAxisLabel}</div>
              <div className="flex flex-wrap gap-4">
                {leftAxisData.map((line, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="w-4 h-0.5"
                      style={{ backgroundColor: line.color }}
                    />
                    <span className="text-sm text-gray-600">{line.label}</span>
                    {line.unit && (
                      <span className="text-xs text-gray-400">({line.unit})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 右轴图例 */}
          {rightAxisData.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-500 mb-2">{rightAxisLabel}</div>
              <div className="flex flex-wrap gap-4">
                {rightAxisData.map((line, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="w-4 h-0.5 border-dashed border-b-2"
                      style={{ borderColor: line.color }}
                    />
                    <span className="text-sm text-gray-600">{line.label}</span>
                    {line.unit && (
                      <span className="text-xs text-gray-400">({line.unit})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ChartContainer>
  );
};

export default DualAxisLineChart;
