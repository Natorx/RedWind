import RadarChart from '../components/charts/RadarChart';
import ScatterChart from '../components/charts/ScatterChart';
import DualAxisLineChart from '../components/charts/LineChart';

import { dualAxisData } from '../mock/dualAxis.mock';
import { dimensions, radarData } from '../mock/radar.mock';
import { scatterData } from '../mock/scatter.mock';
import { pieData } from '../mock/pie.mock';
import { barData } from '../mock/bar.mock';
import { areaData } from '../mock/area.mock';
import PieChart from '../components/charts/PieChart';
import BarChart from '../components/charts/BarChart';
import AreaChart from '../components/charts/AreaChart';
import Heatmap from '../components/charts/HeatMap';
import { mockData_heatMap } from '../mock/heatmap.mock';

const Charts: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 to-neutral-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
            数据图表
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            可视化数据分析仪表板
          </p>
        </div>

        <ul className="space-y-6">
          <li className="bg-neutral-900/80 backdrop-blur-sm rounded-xl shadow-lg border border-red-500/20 overflow-hidden hover:border-red-500/40 transition-all duration-300">
            <div className="p-4">
              <RadarChart
                data={radarData}
                dimensions={dimensions}
                title="产品能力评估"
                maxValue={100}
                showGrid={true}
                showPoints={true}
                showLegend={true}
              />
            </div>
          </li>
          
          <li className="bg-neutral-900/80 backdrop-blur-sm rounded-xl shadow-lg border border-red-500/20 overflow-hidden hover:border-red-500/40 transition-all duration-300">
            <div className="p-4">
              <ScatterChart
                data={scatterData}
                title="用户满意度与使用时长关系"
                xAxisLabel="使用时长（小时）"
                yAxisLabel="满意度评分"
                showRegressionLine={true}
              />
            </div>
          </li>
          
          <li className="bg-neutral-900/80 backdrop-blur-sm rounded-xl shadow-lg border border-red-500/20 overflow-hidden hover:border-red-500/40 transition-all duration-300">
            <div className="p-4">
              <PieChart
                data={pieData}
                title="产品类别销售占比"
                showLegend={true}
                showValues={true}
              />
            </div>
          </li>
          
          <li className="bg-neutral-900/80 backdrop-blur-sm rounded-xl shadow-lg border border-red-500/20 overflow-hidden hover:border-red-500/40 transition-all duration-300">
            <div className="p-4">
              <DualAxisLineChart
                data={dualAxisData}
                title="季度业务指标分析"
                leftAxisLabel="业务规模"
                rightAxisLabel="质量指标"
              />
            </div>
          </li>
          
          <li className="bg-neutral-900/80 backdrop-blur-sm rounded-xl shadow-lg border border-red-500/20 overflow-hidden hover:border-red-500/40 transition-all duration-300">
            <div className="p-4">
              <BarChart
                data={barData}
                title="季度产品销售对比"
                yAxisLabel="销售额（万元）"
                showGrid={true}
              />
            </div>
          </li>
          
          <li className="bg-neutral-900/80 backdrop-blur-sm rounded-xl shadow-lg border border-red-500/20 overflow-hidden hover:border-red-500/40 transition-all duration-300">
            <div className="p-4">
              <AreaChart
                data={areaData}
                title="年度销售趋势分析"
                stacked={false}
                showLegend={true}
              />
            </div>
          </li>
          
          <li className="bg-neutral-900/80 backdrop-blur-sm rounded-xl shadow-lg border border-red-500/20 overflow-hidden hover:border-red-500/40 transition-all duration-300">
            <div className="p-6">
              <h3 className="text-lg font-semibold bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent mb-4">
                热力图
              </h3>
              <Heatmap data={mockData_heatMap} />
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Charts;