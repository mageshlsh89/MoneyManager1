// src/index.jsx
// at the very top of src/index.js or src/main.jsx or src/App.jsx
// top of src/main.tsx (first lines of the file)
import { pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';


import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import ThemeModeProvider from './theme' // ensure this file exists and exports default
import App from './App'
import './index.css'

const root = createRoot(document.getElementById('root'))
root.render(
  <ThemeModeProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ThemeModeProvider>
)
