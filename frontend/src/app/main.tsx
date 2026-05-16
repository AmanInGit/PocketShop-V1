import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/assets/styles/index.css';
import App from './App';

function showBootstrapError(message: string) {
  const root = document.getElementById('root');
  if (!root) return;
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1.5rem;font-family:system-ui,sans-serif;text-align:center;background:#fff">
      <h1 style="font-size:1.25rem;font-weight:600;margin:0 0 0.5rem;color:#0f172a">PocketShop failed to start</h1>
      <p style="margin:0;color:#475569;max-width:32rem">${message}</p>
    </div>
  `;
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

try {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown startup error';
  showBootstrapError(message);
  console.error('[PocketShop] Bootstrap error:', error);
}
