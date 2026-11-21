import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n/index.js'
import App from './App.jsx'
import ThemeProvider from './context/ThemeProvider.jsx'
import { migrateLegacyStorage } from './utils/storage.js'
import { fetchAccessConfig } from './services/firebaseService.js'
import { initRemoteConfig } from './services/accessService.js'

migrateLegacyStorage()

// Eagerly load access config from Firestore so it's ready before the user
// submits a PIN. Falls back to env-var values if Firebase is unreachable.
fetchAccessConfig().then((config) => {
  if (config) initRemoteConfig(config)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
