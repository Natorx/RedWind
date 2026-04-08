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
    <div>
      <ul>
        <li className='my-2'>
          <RadarChart
            data={radarData}
            dimensions={dimensions}
            title="产品能力评估"
            maxValue={100}
            showGrid={true}
            showPoints={true}
            showLegend={true}
          />
        </li>
        <li className='my-2'>
          <ScatterChart
            data={scatterData}
            title="用户满意度与使用时长关系"
            xAxisLabel="使用时长（小时）"
            yAxisLabel="满意度评分"
            showRegressionLine={true}
          />
        </li>
        <li className='my-2'>
          <PieChart
            data={pieData}
            title="产品类别销售占比"
            showLegend={true}
            showValues={true}
          />
        </li>
        <li className='my-2'>
          <DualAxisLineChart
            data={dualAxisData}
            title="季度业务指标分析"
            leftAxisLabel="业务规模"
            rightAxisLabel="质量指标"
          />
        </li>
        <li className='my-2'>
          <BarChart
            data={barData}
            title="季度产品销售对比"
            yAxisLabel="销售额（万元）"
            showGrid={true}
          />
        </li>
        <li>
          <AreaChart
            data={areaData}
            title="年度销售趋势分析"
            stacked={false}
            showLegend={true}
          />
        </li>
        <li className='mt-2 bg-white p-4 mb-4'>
          <h3 className='my-4'>热力图</h3>
          <Heatmap data={mockData_heatMap} />
        </li>
      </ul>
    </div>
  );
};
export default Charts;
