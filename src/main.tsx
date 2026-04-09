import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Apply theme before render to prevent flash
const savedTheme = localStorage.getItem('pba-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
