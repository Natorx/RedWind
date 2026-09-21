import { JSX } from 'react';

import Dashboard from '../pages/Dashboard';
import Printer from '../pages/Printer';
import TypingPractice from '../pages/Passage';
import StartPage from '../pages/Start';
import ChannelPage from '../pages/Channel';

// 仅注册当前保留的模块页面
const contentMap: Record<string, JSX.Element> = {
  start: <StartPage />,
  dashboard: <Dashboard />,
  'typing-practice': <TypingPractice />,
  printer: <Printer />,
  channel: <ChannelPage />,
};
export default contentMap;
