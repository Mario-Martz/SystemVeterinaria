import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'; // Tailwind y variables
import './app.css';   // Tus estilos de Vite
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
