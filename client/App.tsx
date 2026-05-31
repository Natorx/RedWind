import { AnimatePresence, motion, Variants } from 'framer-motion';
import './styles/main.css';
import Sidebar from './layout/sidebar';
import contentMap from './config/contentMap.config';
import { DrawerPage } from './layout/drawer';
import Circle from './layout/circle';
import { MsgContainer } from './components/Msg';
import useAppStore from './stores/appStore';

// 定义切换动画
const pageTransition: Variants = {
  initial: { y: -40, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: 40, opacity: 0 },
};

function App() {
  const activeItem = useAppStore((state) => state.activeItem);

  return (
    <>
      <div className="app-container flex h-100vh overflow-hidden rounded-xl">
        {/* 左侧侧边栏 */}
        <Sidebar />
        {/* 右侧主内容区 */}
        <main className="main-content scroll-none flex-1 flex flex-col overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeItem}
              className="content-wrapper flex-1"
              variants={pageTransition}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
            >
              {contentMap[activeItem] || <div>内容未找到</div>}
            </motion.div>
          </AnimatePresence>
        </main>
        <DrawerPage />
        <Circle />
      </div>
      {/* 渲染消息容器（右下角） */}
      <MsgContainer />
    </>
  );
}

export default App;
