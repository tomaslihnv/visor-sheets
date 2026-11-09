import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ConLogin } from './auth'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConLogin>{(usuario) => <App usuario={usuario} />}</ConLogin>
  </StrictMode>,
)
