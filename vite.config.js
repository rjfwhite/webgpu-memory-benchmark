import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true, // Enable network access for mobile testing
    port: 5173,
    open: true
  },
  build: {
    target: 'es2020',
    outDir: 'dist'
  }
}) 