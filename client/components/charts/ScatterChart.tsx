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
}

interface ScatterChartProps {
  data: ScatterChartData[];
  title: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  showRegressionLine?: boolean;
}

const ScatterChart: React.FC<ScatterChartProps> = ({
  data,
  title,
  xAxisLabel = 'X轴',
  yAxisLabel = 'Y轴',
  showRegressionLine = false
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    datasetIndex: number;
    pointIndex: number;
  } | null>(null);

  // 计算数据范围
  const allPoints = data.flatMap(dataset => dataset.points);
  const minX = Math.min(...allPoints.map(p => p.x));
  const maxX = Math.max(...allPoints.map(p => p.x));
  const minY = Math.min(...allPoints.map(p => p.y));
  const maxY = Math.max(...allPoints.map(p => p.y));
  const xRange = maxX - minX;
  const yRange = maxY - minY;

  // 计算线性回归
  const calculateRegressionLine = () => {
    const allPoints = data.flatMap(dataset => dataset.points);
    const n = allPoints.length;
    
    const sumX = allPoints.reduce((sum, p) => sum + p.x, 0);
    const sumY = allPoints.reduce((sum, p) => sum + p.y, 0);
    const sumXY = allPoints.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = allPoints.reduce((sum, p) => sum + p.x * p.x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
  };

  const regressionLine = showRegressionLine ? calculateRegressionLine() : null;

  return (
    <ChartContainer title={title}>
      <div className="relative">
        {/* 坐标轴标签 */}
        <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center">
          <div className="-rotate-90 whitespace-nowrap text-sm text-gray-500">
            {yAxisLabel}
          </div>
        </div>
        <div className="absolute left-12 right-0 bottom-0 h-8 flex items-center justify-center">
          <div className="text-sm text-gray-500">{xAxisLabel}</div>
        </div>

        {/* 图表主体 */}
        <div className="ml-12 mb-8">
          {/* 网格 */}
          <div className="absolute left-12 right-0 top-0 bottom-8 border border-gray-200 rounded-lg">
            {/* 水平网格线 */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
              <div
                key={`h-${index}`}
                className="absolute left-0 right-0 border-t border-gray-100"
                style={{ top: `${(1 - ratio) * 100}%` }}
              />
            ))}
            {/* 垂直网格线 */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
              <div
                key={`v-${index}`}
                className="absolute top-0 bottom-0 border-l border-gray-100"
                style={{ left: `${ratio * 100}%` }}
              />
            ))}
          </div>

          {/* 散点图 */}
          <div className="relative h-64">
            <svg className="w-full h-full" viewBox="0 0 1000 300">
              {/* 回归线 */}
              {regressionLine && (
                <line
                  x1="50"
                  y1={250 - ((regressionLine.slope * minX + regressionLine.intercept - minY) / yRange) * 200}
                  x2="950"
                  y2={250 - ((regressionLine.slope * maxX + regressionLine.intercept - minY) / yRange) * 200}
                  stroke="#9CA3AF"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              )}

              {/* 数据点 */}
              {data.map((dataset, datasetIndex) => (
                <g key={datasetIndex}>
                  {dataset.points.map((point, pointIndex) => {
                    const x = 50 + ((point.x - minX) / xRange) * 900;
                    const y = 250 - ((point.y - minY) / yRange) * 200;
                    const size = point.size || 6;
                    const isHovered = hoveredPoint?.datasetIndex === datasetIndex && 
                                     hoveredPoint?.pointIndex === pointIndex;
                    
                    return (
                      <g key={pointIndex}>
                        {/* 散点 */}
                        <circle
                          cx={x}
                          cy={y}
                          r={isHovered ? size + 2 : size}
                          fill={dataset.color}
                          fillOpacity="0.7"
                          stroke="white"
                          strokeWidth={isHovered ? 3 : 2}
                          className="cursor-pointer transition-all duration-200"
                          onMouseEnter={() => setHoveredPoint({
                            datasetIndex,
                            pointIndex
                          })}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                        
                        {/* 悬停提示 */}
                        {isHovered && (
                          <g>
                            <rect
                              x={x - 60}
                              y={y - 70}
                              width="120"
                              height="50"
                              rx="6"
                              fill="#1f2937"
                              className="shadow-lg"
                            />
                            <text
                              x={x}
                              y={y - 50}
                              textAnchor="middle"
                              className="text-xs fill-white"
                            >
                              {point.label || `点 ${pointIndex + 1}`}
                            </text>
                            <text
                              x={x}
                              y={y - 35}
                              textAnchor="middle"
                              className="text-xs fill-white"
                            >
                              X: {point.x.toFixed(2)}
                            </text>
                            <text
                              x={x}
                              y={y - 20}
                              textAnchor="middle"
                              className="text-xs fill-white"
                            >
                              Y: {point.y.toFixed(2)}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </g>
              ))}
            </svg>
          </div>

          {/* 坐标轴刻度 */}
          <div className="flex justify-between mt-2 px-4">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
              <div
                key={index}
                className="text-xs text-gray-500"
                style={{ transform: 'translateX(-50%)' }}
              >
                {(minX + ratio * xRange).toFixed(1)}
              </div>
            ))}
          </div>
        </div>

        {/* Y轴刻度 */}
        <div className="absolute left-12 top-0 bottom-8 w-0 flex flex-col justify-between">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
            <div
              key={index}
              className="text-xs text-gray-500 -translate-x-8"
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
          {/* 图例 */}
          <div className="flex flex-wrap gap-4">
            {data.map((dataset, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: dataset.color }}
                />
                <span className="text-sm text-gray-600">{dataset.label}</span>
                <span className="text-xs text-gray-400">
                  ({dataset.points.length}个点)
                </span>
              </div>
            ))}
          </div>

          {/* 统计信息 */}
          <div className="text-sm text-gray-500">
            总计: {allPoints.length}个数据点
            {regressionLine && (
              <span className="ml-4">
                回归线: y = {regressionLine.slope.toFixed(2)}x + {regressionLine.intercept.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </ChartContainer>
  );
};

export default ScatterChart;
