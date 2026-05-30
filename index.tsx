import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const startApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("Root element not found!");
    return;
  }

  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    // Ta bort loader när renderingen påbörjas
    const loader = document.getElementById('loader');
    if (loader) {
      setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
      }, 300);
    }
  } catch (error) {
    console.error("Fatal error during mounting:", error);
    const loader = document.getElementById('loader');
    if(loader) {
      loader.innerHTML = `<div style="padding:20px; color:red; text-align:center;"><h3>Kunde inte starta applikationen</h3><pre style="font-size:10px;">${error}</pre><button onclick="window.location.reload()" style="margin-top:20px; background:#2563eb; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">Ladda om</button></div>`;
    }
  }
};

// Vänta på att DOM är helt redo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
