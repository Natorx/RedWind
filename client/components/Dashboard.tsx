import { 
  Users, 
  ShoppingCart, 
  DollarSign, 
  Activity,
  TrendingUp,
  TrendingDown,
  MoreHorizontal 
} from 'lucide-react';

// 简单的统计卡片组件
const StatCard = ({ title, value, icon: Icon, trend, trendValue, color }: any) => {
  const isPositive = trend === 'up';
  
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 transition-all hover:shadow-md">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          
          {trend && (
            <div className="flex items-center mt-2">
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trendValue}
              </span>
              <span className="text-xs text-gray-400 ml-1">vs last month</span>
            </div>
          )}
        </div>
        
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
};

// 简单图表组件（模拟折线图）
const SimpleChart = () => {
  const data = [20, 45, 28, 80, 45, 65, 55, 70, 85, 60, 75, 90];
  const maxValue = Math.max(...data);
  
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Revenue Overview</h3>
        <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option>Last 12 months</option>
          <option>Last 6 months</option>
          <option>Last 3 months</option>
        </select>
      </div>
      
      <div className="flex items-end space-x-2 h-64">
        {data.map((value, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div 
              className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-lg transition-all duration-300 hover:from-blue-600 hover:to-blue-500"
              style={{ height: `${(value / maxValue) * 100}%` }}
            />
            <span className="text-xs text-gray-500 mt-2">{index + 1}</span>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex justify-between text-sm">
          <div>
            <p className="text-gray-500">Total Revenue</p>
            <p className="text-xl font-bold text-gray-800">$48,295</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500">Growth</p>
            <p className="text-green-600 font-semibold">+23.5%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// 最近活动列表组件
const RecentActivities = () => {
  const activities = [
    { id: 1, user: 'John Doe', action: 'purchased', item: 'Premium Plan', amount: '$99', time: '2 minutes ago', icon: ShoppingCart, color: 'bg-blue-100 text-blue-600' },
    { id: 2, user: 'Jane Smith', action: 'signed up', item: 'Free Trial', amount: '$0', time: '1 hour ago', icon: Users, color: 'bg-green-100 text-green-600' },
    { id: 3, user: 'Mike Johnson', action: 'upgraded to', item: 'Business Plan', amount: '$299', time: '3 hours ago', icon: TrendingUp, color: 'bg-purple-100 text-purple-600' },
    { id: 4, user: 'Sarah Williams', action: 'refunded', item: 'Basic Plan', amount: '$49', time: '5 hours ago', icon: DollarSign, color: 'bg-red-100 text-red-600' },
    { id: 5, user: 'Robert Brown', action: 'cancelled', item: 'Subscription', amount: '-$79', time: '1 day ago', icon: Activity, color: 'bg-orange-100 text-orange-600' },
  ];
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800">Recent Activities</h3>
        <p className="text-sm text-gray-500 mt-1">Latest user actions and transactions</p>
      </div>
      
      <div className="divide-y divide-gray-100">
        {activities.map((activity) => {
          const IconComponent = activity.icon;
          return (
            <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${activity.color}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      <span className="font-semibold">{activity.user}</span>{' '}
                      <span className="text-gray-600">{activity.action}</span>{' '}
                      <span className="font-semibold">{activity.item}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{activity.time}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-semibold text-gray-700">{activity.amount}</span>
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-gray-100">
        <button className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium">
          View all activities →
        </button>
      </div>
    </div>
  );
};

// 主仪表盘组件
const Dashboard = () => {
  // 统计数据
  const stats = [
    { title: 'Total Revenue', value: '$48,295', icon: DollarSign, trend: 'up', trendValue: '+12.5%', color: 'bg-gradient-to-br from-blue-500 to-blue-600' },
    { title: 'Total Users', value: '2,543', icon: Users, trend: 'up', trendValue: '+8.2%', color: 'bg-gradient-to-br from-green-500 to-green-600' },
    { title: 'Total Orders', value: '1,289', icon: ShoppingCart, trend: 'down', trendValue: '-3.1%', color: 'bg-gradient-to-br from-purple-500 to-purple-600' },
    { title: 'Active Sessions', value: '347', icon: Activity, trend: 'up', trendValue: '+5.4%', color: 'bg-gradient-to-br from-orange-500 to-orange-600' },
  ];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
              </div>
              <h1 className="ml-3 text-xl font-bold text-gray-800">Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    JD
                  </div>
                  <span className="text-sm font-medium text-gray-700 hidden sm:inline">John Doe</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 统计卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>
        
        {/* 图表和活动区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SimpleChart />
          </div>
          <div className="lg:col-span-1">
            <RecentActivities />
          </div>
        </div>
        
        {/* 底部额外信息 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h4 className="text-sm font-semibold text-gray-600 mb-3">Quick Actions</h4>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700">
                📊 Generate Report
              </button>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700">
                👥 Invite Users
              </button>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700">
                ⚙️ Settings
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h4 className="text-sm font-semibold text-gray-600 mb-3">System Status</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">API Response Time</span>
                <span className="text-sm font-medium text-green-600">124ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Uptime</span>
                <span className="text-sm font-medium text-green-600">99.98%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active Users</span>
                <span className="text-sm font-medium text-blue-600">347</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
            <h4 className="text-sm font-semibold opacity-90 mb-2">Monthly Target</h4>
            <p className="text-2xl font-bold">78%</p>
            <div className="mt-3 bg-white/20 rounded-full h-2">
              <div className="bg-white rounded-full h-2" style={{ width: '78%' }}></div>
            </div>
            <p className="text-xs opacity-90 mt-3">12 days remaining in this month</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;