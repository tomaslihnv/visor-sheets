import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages publica la rama main tal cual (sin compilar): `npm run publicar` deja la app compilada en la
// raíz del repo (index.html + assets/). La carpeta de salida va en ese comando y no aquí: en la configuración,
// el plugin de Tailwind ignoraría toda la raíz (incluido app/src) y el servidor de desarrollo quedaría sin estilos.
// base relativa: funciona en /visor-sheets/ y en cualquier ruta.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
