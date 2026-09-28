import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ToastProvider } from './hooks/useToast';
import { DiagramProvider } from './state/DiagramContext';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root was not found');

createRoot(container).render(
  <StrictMode>
    <ToastProvider>
      <DiagramProvider>
        <App />
      </DiagramProvider>
    </ToastProvider>
  </StrictMode>,
);
