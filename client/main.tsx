import React from 'react';
import ReactDOM from 'react-dom/client';
import 'virtual:uno.css';
import { ActiveItemProvider } from './context/activeItemContext';
import { SettingsProvider } from './context/drawerSettingContext';
import App from './App';
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ActiveItemProvider>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </ActiveItemProvider>
  </React.StrictMode>,
);
