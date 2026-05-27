import { Activity, ShoppingCart, Users } from "lucide-react";
import { getModuleNum } from "../utils/project";

  // 统计卡片数据
export const stats = [
    {
      title: '已开发模块',
      value: `${getModuleNum()}`,
      icon: Activity,
      trend: 'up',
      trendValue: '+2 个',
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
    },
    { title: 'Total Users', value: '2,543', icon: Users, trend: 'up', trendValue: '+8.2%', color: 'bg-gradient-to-br from-green-500 to-green-600' },
    { title: 'Total Orders', value: '1,289', icon: ShoppingCart, trend: 'down', trendValue: '-3.1%', color: 'bg-gradient-to-br from-purple-500 to-purple-600' },
    { title: 'Active Sessions', value: '347', icon: Activity, trend: 'up', trendValue: '+5.4%', color: 'bg-gradient-to-br from-orange-500 to-orange-600' },
  ];