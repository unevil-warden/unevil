import React from 'react'
import { createRoot } from 'react-dom/client'
import './options.css'
import { Options } from './Options'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>
)
