import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ActiveItemProvider } from './context/activeItemContext';
import { SettingsProvider } from './context/drawerSettingContext';
import 'virtual:uno.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ActiveItemProvider>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </ActiveItemProvider>
  </React.StrictMode>,
);
