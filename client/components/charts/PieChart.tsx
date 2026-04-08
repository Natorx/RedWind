// components/PieChart.tsx
import React from 'react';
import ChartContainer from './ChartContainer';

interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  title: string;
  showLegend?: boolean;
  showValues?: boolean;
}

const PieChart: React.FC<PieChartProps> = ({
  data,
  title,
  showLegend = true,
  showValues = true
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  
  let currentAngle = 0;

  return (
    <ChartContainer title={title}>
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* 饼图主体 */}
        <div className="relative w-64 h-64">
          <svg className="w-full h-full" viewBox="0 0 200 200">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
              
              const segment = (
                <circle
                  key={index}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth="40"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={-currentAngle * circumference / 360}
                  transform="rotate(-90 100 100)"
                  className="transition-all duration-500"
                />
              );
              
              currentAngle += (percentage / 100) * 360;
              return segment;
            })}
            
            {/* 中心文本 */}
            <text
              x="100"
              y="100"
              textAnchor="middle"
              dy="0.3em"
              className="text-2xl font-bold fill-gray-800"
            >
              {total.toLocaleString()}
            </text>
            <text
              x="100"
              y="125"
              textAnchor="middle"
              className="text-sm fill-gray-500"
            >
              总计
            </text>
          </svg>
        </div>

        {/* 图例 */}
        {showLegend && (
          <div className="flex-1 max-w-md">
            <div className="space-y-3">
              {data.map((item, index) => {
                const percentage = ((item.value / total) * 100).toFixed(1);
                return (
                  <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium text-gray-700">{item.label}</span>
                    </div>
                    <div className="text-right">
                      {showValues && (
                        <div className="font-bold text-gray-800">
                          {item.value.toLocaleString()}
                        </div>
                      )}
                      <div className="text-sm text-gray-500">{percentage}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ChartContainer>
  );
};

export default PieChart;
