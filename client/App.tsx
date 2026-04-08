import './styles/main.css';
import { useActiveItem } from './context/activeItemContext'; // 新增导入
import Sidebar from './layout/sidebar';
import contentMap from './config/contentMap.config';
import { DrawerPage } from './layout/drawer';

function App() {
  const { activeItem } = useActiveItem();
  return (
    <div className="app-container flex h-100vh overflow-hidden">
      {/* 左侧侧边栏 */}
      <Sidebar />
      {/* 右侧主内容区 */}
      <main className="main-content flex-1 flex flex-col overflow-y-auto">
        <div className="content-wrapper flex-1">
          {contentMap[activeItem] || <div>内容未找到</div>}
        </div>
      </main>
      <DrawerPage/>
    </div>
  );
}

export default App;
