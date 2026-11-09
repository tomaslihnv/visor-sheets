import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages publica la rama main tal cual (sin compilar): `npm run publicar` deja la app compilada en la
// raíz del repo (index.html + assets/). base relativa: funciona en /visor-sheets/ y en cualquier ruta.
export default defineConfig({
  base: './',
  build: { outDir: '..', emptyOutDir: false }, // emptyOutDir false: la raíz tiene el resto del repo
  plugins: [react(), tailwindcss()],
})
