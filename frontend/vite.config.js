import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5020,
    allowedHosts: [
      'localhost',
      'db-assistant.aitechnexa.com',
    ],
    watch: {
      usePolling: true
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          http: ['axios'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
