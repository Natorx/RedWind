import { JSX } from 'react';

import Dashboard from '../pages/Dashboard';
import TypingPractice from '../pages/Passage';
import StartPage from '../pages/Start';
import ChannelPage from '../pages/Channel';
import Peripheral from '../pages/Peripheral';
import RedStation from '../pages/RedStation';
import ImageStage from '../pages/ImageStage';

// 仅注册当前保留的模块页面
const contentMap: Record<string, JSX.Element> = {
  start: <StartPage />,
  dashboard: <Dashboard />,
  'typing-practice': <TypingPractice />,
  channel: <ChannelPage />,
  peripheral: <Peripheral />,
  redstation: <RedStation />,
  'image-stage': <ImageStage />,
};
export default contentMap;
