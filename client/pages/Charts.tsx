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

const Charts: React.FC = () => {
  return (
    <div>
      <ul>
        <li>
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
        <li>
          <ScatterChart
            data={scatterData}
            title="用户满意度与使用时长关系"
            xAxisLabel="使用时长（小时）"
            yAxisLabel="满意度评分"
            showRegressionLine={true}
          />
        </li>
        <li>
          <PieChart
            data={pieData}
            title="产品类别销售占比"
            showLegend={true}
            showValues={true}
          />
        </li>
        <li>
          <DualAxisLineChart
            data={dualAxisData}
            title="季度业务指标分析"
            leftAxisLabel="业务规模"
            rightAxisLabel="质量指标"
          />
        </li>
        <li>
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
      </ul>
    </div>
  );
};
export default Charts;
