import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/down_stairs_game/', // GitHub Pages base path (repository name)
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  define: {
    // Map process.env.API_KEY to import.meta.env.VITE_API_KEY so the code works in browser
    'process.env.API_KEY': 'import.meta.env.VITE_API_KEY',
    // Polyfill remaining process.env to prevent crashes
    'process.env': {} 
  }
})