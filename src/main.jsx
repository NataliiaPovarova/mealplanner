import React from 'react'
import ReactDOM from 'react-dom/client'
import './i18n/index.js'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { UserDataProvider } from './contexts/UserDataContext.jsx'
import { TourProvider } from './tour/TourContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <UserDataProvider>
        <TourProvider>
          <App />
        </TourProvider>
      </UserDataProvider>
    </AuthProvider>
  </React.StrictMode>,
)
