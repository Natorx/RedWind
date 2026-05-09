import DualAxisLineChart from '../../components/charts/LineChart';
import ScatterChart from '../../components/charts/ScatterChart';
import RadarChart from '../../components/charts/RadarChart';
import AreaChart from '../../components/charts/AreaChart';
import PieChart from '../../components/charts/PieChart';
import BarChart from '../../components/charts/BarChart';
import Heatmap from '../../components/charts/HeatMap';
import { dimensions, radarData } from '../../mock/radar.mock';
import { mockData_heatMap } from '../../mock/heatmap.mock';
import { dualAxisData } from '../../mock/dualAxis.mock';
import { scatterData } from '../../mock/scatter.mock';
import { areaData } from '../../mock/area.mock';
import { pieData } from '../../mock/pie.mock';
import { barData } from '../../mock/bar.mock';

// 配置项类型
interface ChartConfig {
  component: React.ComponentType<any>; // 图表组件
  props: Record<string, any>; // 传给组件的 props
  className?: string; // 额外的类名（可选）
}

export const chartConfigs: ChartConfig[] = [
  {
    component: RadarChart,
    props: {
      data: radarData,
      dimensions: dimensions,
      title: '产品能力评估',
      maxValue: 100,
      showGrid: true,
      showPoints: true,
      showLegend: true,
    },
  },
  {
    component: ScatterChart,
    props: {
      data: scatterData,
      title: '用户满意度与使用时长关系',
      xAxisLabel: '使用时长（小时）',
      yAxisLabel: '满意度评分',
      showRegressionLine: true,
    },
  },
  {
    component: PieChart,
    props: {
      data: pieData,
      title: '产品类别销售占比',
      showLegend: true,
      showValues: true,
    },
  },
  {
    component: DualAxisLineChart,
    props: {
      data: dualAxisData,
      title: '季度业务指标分析',
      leftAxisLabel: '业务规模',
      rightAxisLabel: '质量指标',
    },
  },
  {
    component: BarChart,
    props: {
      data: barData,
      title: '季度产品销售对比',
      yAxisLabel: '销售额（万元）',
      showGrid: true,
    },
  },
  {
    component: AreaChart,
    props: {
      data: areaData,
      title: '年度销售趋势分析',
      stacked: false,
      showLegend: true,
    },
  },
  {
    component: Heatmap,
    props: {
      data: mockData_heatMap,
    },
  },
];
