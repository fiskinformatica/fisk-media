import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative base keeps the build working on GitHub Pages project sites
  // (https://user.github.io/repo/) and on custom domains.
  base: './',
  plugins: [react(), tailwindcss()],
})
