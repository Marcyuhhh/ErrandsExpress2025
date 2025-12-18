import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: [
      'frontend-production-270d.up.railway.app', // Add your specific Railway URL here
    ],
  },
})