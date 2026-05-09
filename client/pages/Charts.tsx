import { chartConfigs } from '../config/data/charts';

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
          {chartConfigs.map((config,index)=>{
            const ChartComponent = config.component;
            return (
              <li key={index} className={`bg-neutral-900/80 backdrop-blur-sm rounded-xl shadow-lg border border-red-500/20 overflow-hidden hover:border-red-500/40 transition-all duration-300 ${config.className || ''}`}>
                <ChartComponent {...config.props} />
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  );
};

export default Charts;