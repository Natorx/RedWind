import { JSX } from 'react';

import Dashboard from '../pages/Dashboard';
import Printer from '../pages/Printer';
import TypingPractice from '../pages/Typing';
import QRCodePage from '../pages/QRCode';
import FuncConfig from '../pages/Configs';
import StartPage from '../pages/Start';
import FileHandler from '../pages/Filehandler';
import Agent from '../pages/Agent';
import Subscribe from '../pages/Subscribe';
import ChannelPage from '../pages/Channel';

const contentMap: Record<string, JSX.Element> = {
  start: <StartPage />,
  'module-config': <FuncConfig />,
  dashboard: <Dashboard />,
  'file-hander': <FileHandler />,
  'typing-practice': <TypingPractice />,
  printer: <Printer />,
  qrcode: <QRCodePage />,
  agent: <Agent />,
  subscribe: <Subscribe />,
  channel: <ChannelPage />,
};
export default contentMap;