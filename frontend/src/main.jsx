// 🔇 Desativa logs em produção
if (import.meta.env.MODE === 'production') {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 text-gray-900 dark:text-gray-100 transition-colors duration-500">
      <App />
    </div>
  </React.StrictMode>,
)
