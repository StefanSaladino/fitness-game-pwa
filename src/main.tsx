import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { PwaStatus } from './pwa/PwaStatus';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <PwaStatus />
  </StrictMode>,
);

