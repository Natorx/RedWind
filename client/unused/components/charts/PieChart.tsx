// components/PieChart.tsx
import React, { useState } from 'react';
import ChartContainer from './ChartContainer';

interface PieChartData {
  label: string;
  value: number;
  color: string;
  visible?: boolean;
}

interface PieChartProps {
  data: PieChartData[];
  title: string;
  showLegend?: boolean;
  showValues?: boolean;
}

const PieChart: React.FC<PieChartProps> = ({
  data: initialData,
  title,
  showLegend = true,
  showValues = true
}) => {
  const [data, setData] = useState(initialData.map(d => ({ ...d, visible: d.visible !== false })));
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
  const [explodedSegment, setExplodedSegment] = useState<number | null>(null);
  const [_, setIsAdjustingValue] = useState<number | null>(null);

  // 只计算可见部分的总和
  const visibleData = data.filter(d => d.visible);
  const total = visibleData.reduce((sum, item) => sum + item.value, 0);
  const radius = 80;
  const explodeDistance = 10;

  // 更新数值
  const updateValue = (index: number, newValue: number) => {
    const newData = [...data];
    newData[index].value = Math.max(0, newValue);
    setData(newData);
  };

  // 切换可见性
  const toggleVisibility = (index: number) => {
    const newData = [...data];
    newData[index].visible = !newData[index].visible;
    setData(newData);
    if (selectedSegment === index) setSelectedSegment(null);
    if (explodedSegment === index) setExplodedSegment(null);
  };

  // 重置所有数据
  const resetAll = () => {
    setData(initialData.map(d => ({ ...d, visible: d.visible !== false })));
    setSelectedSegment(null);
    setExplodedSegment(null);
  };

  // 设置平均分配
  const setEqualDistribution = () => {
    const equalValue = 100 / data.length;
    const newData = data.map(d => ({ ...d, value: equalValue }));
    setData(newData);
  };

  // 归一化（总和为100）
  const normalizeTo100 = () => {
    const currentTotal = data.reduce((sum, d) => sum + d.value, 0);
    if (currentTotal === 0) return;
    const newData = data.map(d => ({ ...d, value: (d.value / currentTotal) * 100 }));
    setData(newData);
  };

  let currentAngle = 0;

  return (
    <ChartContainer title={title}>
      <div className="flex gap-6">
        {/* 左侧控制面板 */}
        <div className="w-80 flex-shrink-0 overflow-y-auto max-h-[600px] pr-4">
          <div className="sticky top-0 bg-white pb-4 mb-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">控制面板</h3>
            <div className="flex gap-2 mb-2">
              <button
                onClick={resetAll}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                重置
              </button>
              <button
                onClick={setEqualDistribution}
                className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              >
                平均分配
              </button>
              <button
                onClick={normalizeTo100}
                className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
              >
                归一化
              </button>
            </div>
            <div className="text-sm text-gray-600">
              总计: <span className="font-bold">{total.toFixed(1)}</span>
            </div>
          </div>

          {data.map((item, index) => {
            const percentage = item.visible && total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
            
            return (
              <div 
                key={index} 
                className={`mb-4 p-4 rounded-lg transition-all ${
                  selectedSegment === index ? 'bg-blue-50 ring-2 ring-blue-300' : 'bg-gray-50'
                } ${!item.visible ? 'opacity-50' : ''}`}
                onClick={() => setSelectedSegment(index)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-gray-800">{item.label}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExplodedSegment(explodedSegment === index ? null : index);
                      }}
                      className={`px-2 py-1 text-xs rounded-md transition-colors ${
                        explodedSegment === index 
                          ? 'bg-yellow-200 text-yellow-800' 
                          : 'bg-white text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {explodedSegment === index ? '收回' : '展开'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVisibility(index);
                      }}
                      className="px-2 py-1 text-xs bg-white rounded-md shadow-sm hover:shadow transition-shadow"
                    />


                  </div>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">数值</span>
                      <span className="font-mono font-medium">{item.value.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={total > 0 ? total * 2 : 100}
                      value={item.value}
                      onChange={(e) => updateValue(index, parseFloat(e.target.value))}
                      onMouseEnter={() => setIsAdjustingValue(index)}
                      onMouseLeave={() => setIsAdjustingValue(null)}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, ${item.color} 0%, ${item.color} ${(item.value / (total > 0 ? total * 2 : 100)) * 100}%, #E5E7EB ${(item.value / (total > 0 ? total * 2 : 100)) * 100}%, #E5E7EB 100%)`
                      }}
                    />
                  </div>
                  
                  {item.visible && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">占比</span>
                      <span className="font-medium" style={{ color: item.color }}>
                        {percentage}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 右侧饼图 */}
        <div className="flex-1">
          <div className="flex flex-col items-center">
            {/* 饼图主体 */}
            <div className="relative w-80 h-80">
              <svg className="w-full h-full" viewBox="0 0 200 200">
                {visibleData.map((item) => {
                  const originalIndex = data.findIndex(d => d.label === item.label);
                  const percentage = (item.value / total) * 100;
                  const angle = (percentage / 100) * 360;
                  const strokeDasharray = `${(percentage / 100) * (2 * Math.PI * radius)} ${2 * Math.PI * radius}`;
                  
                  const isHovered = hoveredSegment === originalIndex;
                  const isSelected = selectedSegment === originalIndex;
                  const isExploded = explodedSegment === originalIndex;
                  
                  // 计算偏移
                  let offsetX = 0;
                  let offsetY = 0;
                  if (isExploded) {
                    const offsetAngle = (currentAngle + angle / 2) * Math.PI / 180;
                    offsetX = Math.cos(offsetAngle) * explodeDistance;
                    offsetY = Math.sin(offsetAngle) * explodeDistance;
                  }
                  
                  const segment = (
                    <circle
                      key={originalIndex}
                      cx={100 + (isExploded ? offsetX : 0)}
                      cy={100 + (isExploded ? offsetY : 0)}
                      r={radius}
                      fill="transparent"
                      stroke={item.color}
                      strokeWidth={isHovered || isSelected ? 44 : 40}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={-currentAngle * 2 * Math.PI * radius / 360}
                      transform="rotate(-90 100 100)"
                      className="transition-all duration-300 cursor-pointer"
                      style={{
                        filter: isHovered || isSelected ? 'brightness(0.95)' : 'none',
                        strokeLinecap: 'butt'
                      }}
                      onMouseEnter={() => setHoveredSegment(originalIndex)}
                      onMouseLeave={() => setHoveredSegment(null)}
                      onClick={() => setSelectedSegment(originalIndex === selectedSegment ? null : originalIndex)}
                    />
                  );
                  
                  currentAngle += angle;
                  return segment;
                })}
                
                {/* 中心文本 - 显示总计和悬停信息 */}
                <text
                  x="100"
                  y="95"
                  textAnchor="middle"
                  dy="0.3em"
                  className="text-2xl font-bold fill-gray-800"
                >
                  {hoveredSegment !== null && data[hoveredSegment].visible
                    ? data[hoveredSegment].value.toFixed(1)
                    : total.toFixed(1)}
                </text>
                <text
                  x="100"
                  y="118"
                  textAnchor="middle"
                  className="text-sm fill-gray-500"
                >
                  {hoveredSegment !== null && data[hoveredSegment].visible
                    ? data[hoveredSegment].label
                    : '总计'}
                </text>
                {hoveredSegment !== null && data[hoveredSegment].visible && total > 0 && (
                  <text
                    x="100"
                    y="138"
                    textAnchor="middle"
                    className="text-xs fill-gray-400"
                  >
                    {((data[hoveredSegment].value / total) * 100).toFixed(1)}%
                  </text>
                )}
              </svg>
            </div>

            {/* 图例和统计信息 */}
            {showLegend && (
              <div className="mt-6 w-full pt-4 border-t border-gray-200">
                <div className="flex flex-wrap justify-center gap-4">
                  {data.map((item, index) => {
                    const percentage = item.visible && total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                    const isActive = item.visible;
                    
                    return (
                      <div
                        key={index}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
                          selectedSegment === index ? 'bg-blue-50 ring-1 ring-blue-300' : 'hover:bg-gray-50'
                        } ${!isActive ? 'opacity-40' : ''}`}
                        onClick={() => {
                          setSelectedSegment(index);
                          if (!item.visible) toggleVisibility(index);
                        }}
                      >
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: isActive ? item.color : '#9CA3AF' }}
                        />
                        <span className={`text-sm ${selectedSegment === index ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                          {item.label}
                        </span>
                        {showValues && (
                          <span className="text-sm font-mono text-gray-700">
                            {item.value.toFixed(1)}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          ({percentage}%)
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleVisibility(index);
                          }}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* 统计信息 */}
                <div className="mt-4 text-sm text-gray-500 text-center">
                  共 {visibleData.length} / {data.length} 个分类可见
                  {selectedSegment !== null && data[selectedSegment] && (
                    <span className="ml-4 font-medium text-gray-700">
                      当前: {data[selectedSegment].label} - 
                      占比 {((data[selectedSegment].value / total) * 100).toFixed(1)}%
                    </span>
                  )}
                </div>

                {/* 选中项的详细控制 */}
                {selectedSegment !== null && data[selectedSegment] && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: data[selectedSegment].color }}
                        />
                        <span className="font-semibold text-blue-800">
                          {data[selectedSegment].label}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedSegment(null)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        关闭
                      </button>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-blue-600 block mb-1">调整数值</label>
                        <input
                          type="range"
                          min="0"
                          max={total > 0 ? total * 2 : 100}
                          value={data[selectedSegment].value}
                          onChange={(e) => updateValue(selectedSegment, parseFloat(e.target.value))}
                          className="w-full"
                          style={{
                            background: `linear-gradient(to right, ${data[selectedSegment].color} 0%, ${data[selectedSegment].color} ${(data[selectedSegment].value / (total > 0 ? total * 2 : 100)) * 100}%, #E5E7EB ${(data[selectedSegment].value / (total > 0 ? total * 2 : 100)) * 100}%, #E5E7EB 100%)`
                          }}
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          value={data[selectedSegment].value.toFixed(1)}
                          onChange={(e) => updateValue(selectedSegment, parseFloat(e.target.value))}
                          className="w-full px-2 py-1 text-sm border rounded-md"
                          step="1"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ChartContainer>
  );
};

export default PieChart;