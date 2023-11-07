// import viteSSR from 'vite-ssr/react'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
// import { routes } from './routes'
import './styles/globals.css'
import 'react-loading-skeleton/dist/skeleton.css'
import 'form-request-submit-polyfill'

declare global {
  interface Window {
    gtag?: any
  }
}

const container = document.getElementById('root')
if (!container) throw new Error('Missing root element')

const root = createRoot(container)

root.render(
  <BrowserRouter>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </BrowserRouter>
)
