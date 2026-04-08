// drawerSettingContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

// 定义Context值的类型
interface SettingsContextType {
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
}

// 定义Provider props类型
interface SettingsProviderProps {
  children: ReactNode;
}

// 创建Context时指定类型
const SettingsContext = createContext<SettingsContextType>({
  isSettingsOpen: false,
  setIsSettingsOpen: () => {} // 空函数作为默认值
});

export const useSettingDrawer = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  return (
    <SettingsContext.Provider value={{ isSettingsOpen, setIsSettingsOpen }}>
      {children}
    </SettingsContext.Provider>
  );
};
