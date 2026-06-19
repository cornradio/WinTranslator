import React from 'react';
import ReactDOM from 'react-dom/client';
import PopupApp from './popup/App';
import SettingsApp from './settings/App';
import './styles/global.css';

function Router() {
  const hash = window.location.hash;
  const isPopup = hash === '#popup';

  // Popup window needs transparent background
  if (isPopup) {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
  }

  if (isPopup) {
    return <PopupApp />;
  }
  return <SettingsApp />;
}

const root = document.getElementById('root')!;

// Global error handler - show errors visibly instead of crashing silently
window.addEventListener('error', (e) => {
  root.innerHTML = `<div style="color:#ff6b6b;padding:16px;font-size:12px;white-space:pre-wrap;">
Runtime Error:\n${e.message}\n${e.filename}:${e.lineno}</div>`;
});

window.addEventListener('unhandledrejection', (e) => {
  root.innerHTML = `<div style="color:#ff6b6b;padding:16px;font-size:12px;white-space:pre-wrap;">
Unhandled Promise Rejection:\n${e.reason}</div>`;
});

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
