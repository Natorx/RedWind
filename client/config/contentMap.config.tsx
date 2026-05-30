import { JSX } from 'react';

import RequestTool from '../pages/API';
import Dashboard from '../pages/Dashboard';
import Printer from '../pages/Printer';
import TypingPractice from '../pages/Typing';
import QRCodePage from '../pages/QRCode';
import FuncConfig from '../pages/Configs';
import StartPage from '../pages/Start';
import DrillGround from '../pages/DrillGround';
import ServerChat from '../pages/Chat_Server';
import DocReader from '../pages/Docs';
import Community from '../pages/Communnity';
import FileHandler from '../pages/Filehandler';
import TodoList from '../pages/TodoList';
import Audio from '../pages/Audio';
import Agent from '../pages/Agent';
import Personalization from '../pages/Personalization';
import Subscribe from '../pages/Subscribe';

const contentMap: Record<string, JSX.Element> = {
  start: <StartPage />,
  'module-config': <FuncConfig />,
  dashboard: <Dashboard />,
  'api-debug': <RequestTool />,
  'file-hander': <FileHandler />,
  'typing-practice': <TypingPractice />,
  printer: <Printer />,
  qrcode: <QRCodePage />,
  'audio-control': <Audio />,
  'drill-ground': <DrillGround />,
  'server-chat': <ServerChat />,
  'doc-reader': <DocReader />,
  community: <Community />,
  todo: <TodoList />,
  agent: <Agent />,
  personalization: <Personalization />,
  subscribe: <Subscribe />,
};
export default contentMap;
