import React from 'react'
import { createRoot } from 'react-dom/client'
import './dashboard.css'
import { Dashboard } from './Dashboard'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Dashboard />
  </React.StrictMode>
)
