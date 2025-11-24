import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5020,
    allowedHosts: [
      'db-assistant.aitechnexa.com',
      'localhost',
      '.aitechnexa.com'
    ],
    watch: {
      usePolling: true
    }
  }
})
