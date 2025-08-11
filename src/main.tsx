import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA (in production only)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = '/sw.js';
    navigator.serviceWorker.register(swUrl).catch(() => {
      // fail silently
    });
  });
}
