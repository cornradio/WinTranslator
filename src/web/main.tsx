import React from 'react';
import ReactDOM from 'react-dom/client';
import '../renderer/styles/global.css';
import './web.css';
import { installWebShim } from './shim';
import WebApp from './App';

installWebShim();

const root = document.getElementById('root')!;

window.addEventListener('error', (event) => {
  root.innerHTML = `<div style="color:#ff6b6b;padding:16px;font-size:12px;white-space:pre-wrap;">Runtime Error:\n${event.message}\n${event.filename}:${event.lineno}</div>`;
});

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <WebApp />
  </React.StrictMode>
);
