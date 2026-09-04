import React from 'react'
import ReactDOM from 'react-dom/client'
import './i18n/index.js'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { UserDataProvider } from './contexts/UserDataContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <UserDataProvider>
        <App />
      </UserDataProvider>
    </AuthProvider>
  </React.StrictMode>,
)
