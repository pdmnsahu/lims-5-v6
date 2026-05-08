import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://lims-5-v6.onrender.com',
        changeOrigin: true,
      },
    },
  },
});
