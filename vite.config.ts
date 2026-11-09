import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    // En desarrollo, las salas las atiende el Worker local (npm run preview en otra terminal).
    proxy: {
      '/api': { target: 'http://127.0.0.1:8791', ws: true }
    }
  }
});
