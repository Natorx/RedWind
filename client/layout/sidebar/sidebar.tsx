import { useActiveItem } from '../../context/activeItemContext'; // 新增
import { sidebarItems } from './fc_sidebar';
const Sidebar: React.FC = () => {
  const { activeItem, setActiveItem } = useActiveItem();
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2 className="logo text-cyan">Wind Project</h2>
        <p className="logo-subtitle">简约管理平台</p>
      </div>

      <nav className="sidebar-nav overflow-y-scroll">
        <ul>
          {sidebarItems.map((item) => (
            <li key={item.id}>
              <button
                className={`nav-btn ${activeItem === item.id ? 'active' : ''}`}
                onClick={() => setActiveItem(item.id)}
              >
                {item.icon && <span className="nav-icon">{item.icon}</span>}
                <span className="nav-label">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer px-5 py-4 border-t border-gray-200">
        <div className="user-info flex items-center">
          <div className="user-avatar w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center mr-3 overflow-hidden">
            <img
              src="client/mock/pics/avatar.jpg"
              alt="用户头像"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="user-details">
            <p className="user-name font-semibold text-sm">Natorx</p>
            <p className="user-status text-xs text-gray-500">在线</p>
          </div>
          <button className="ml-auto p-2 hover:bg-gray-300 rounded-lg transition-colors border-none cursor-pointer">
            ⚙️
          </button>
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
