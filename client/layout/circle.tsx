// circle.tsx
import React, { useState, useEffect } from 'react';
import { visibility } from '../utils/visible';
import iconSrc from '../assets/icon.png';

const Circle: React.FC = () => {
  const [showCircle, setShowCircle] = useState(visibility.getShowCircle());

  useEffect(() => {
    const unsubscribe = visibility.subscribe((_, newShowCircle) => {
      setShowCircle(newShowCircle);
    });
    return unsubscribe;
  }, []);

  if (!showCircle) return null;

  return (
    <button
      className="fixed bottom-6 right-6 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center cursor-pointer border-none transition-all duration-300 ease-in-out animate-slide-in-right hover:scale-105 hover:shadow-xl z-50"
      onClick={() => visibility.setShowSidebar(true)}
      aria-label="打开侧边栏"
    >
      <img className="w-8 h-8" src={iconSrc} alt="菜单" />
    </button>
  );
};

export default Circle;