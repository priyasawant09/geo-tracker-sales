import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {
      API_KEY: JSON.stringify(process.env.API_KEY || '')
    }
  },
  server: {
    port: 3000,
    open: true,
    host: true // This allows the Android emulator to connect to your local dev server
  },
  build: {
    outDir: 'dist'
  }
});
