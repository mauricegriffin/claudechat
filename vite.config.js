import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Resolve @ alias for LiftKit imports
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Ensure public directory files are served correctly
  publicDir: 'public',
  build: {
    // Copy public files to dist
    copyPublicDir: true,
    // Generate source maps for better debugging
    sourcemap: true,
  },
  server: {
    hmr: {
      overlay: true
    },
    watch: {
      usePolling: true,
      interval: 100
    }
  }
})
