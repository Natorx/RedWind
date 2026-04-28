// visible.ts
type VisibilityListener = (showSidebar: boolean, showCircle: boolean) => void;

let showSidebar = true;
let showCircle = false;
const listeners: VisibilityListener[] = [];

export const visibility = {
  getShowSidebar: () => showSidebar,
  getShowCircle: () => showCircle,
  
  setShowSidebar: (show: boolean) => {
    showSidebar = show;
    showCircle = !show;
    notifyListeners();
  },
  
  setShowCircle: (show: boolean) => {
    showCircle = show;
    showSidebar = !show;
    notifyListeners();
  },
  
  toggleSidebar: () => {
    showSidebar = !showSidebar;
    showCircle = !showSidebar;
    notifyListeners();
  },
  
  toggleCircle: () => {
    showCircle = !showCircle;
    showSidebar = !showCircle;
    notifyListeners();
  },
  
  subscribe: (listener: VisibilityListener) => {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    };
  }
};

export function notifyListeners() {
  listeners.forEach(listener => listener(showSidebar, showCircle));
}