import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { PlanProvider } from './context/PlanContext.jsx'
import { migrateStorage } from './lib/migrateStorage.js'

migrateStorage()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PlanProvider>
      <App />
    </PlanProvider>
  </StrictMode>,
)
