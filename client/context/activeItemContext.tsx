import { createContext, useContext, ReactNode, useState } from 'react';

interface ActiveItemContextType {
  activeItem: string;
  setActiveItem: (item: string) => void;
}

const ActiveItemContext = createContext<ActiveItemContextType | undefined>(undefined);

export const ActiveItemProvider = ({ children }: { children: ReactNode }) => {
  const [activeItem, setActiveItem] = useState<string>('start');
  
  return (
    <ActiveItemContext.Provider value={{ activeItem, setActiveItem }}>
      {children}
    </ActiveItemContext.Provider>
  );
};

export const useActiveItem = () => {
  const context = useContext(ActiveItemContext);
  if (!context) {
    throw new Error('useActiveItem must be used within ActiveItemProvider');
  }
  return context;
};
