import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative asset paths so the build works whether it's deployed at a
  // domain root or a subdirectory (e.g. a cPanel account's public_html
  // or a subfolder under it) without any extra config.
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // In dev, `npm run dev:api` serves the PHP backend on :8787 (PHP's
    // built-in server) - proxy /api there so the frontend can be built
    // and tested exactly like it runs in production (same relative
    // `api/...` requests, just forwarded instead of same-process).
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
