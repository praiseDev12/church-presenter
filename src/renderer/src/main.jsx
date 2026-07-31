// src/renderer/src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import Display from './pages/Display'
import './assets/base.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        {/* Control window — the operator UI */}
        <Route path="/" element={<App />} />

        {/* Display window — the projection screen */}
        <Route path="/display" element={<Display />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
)
