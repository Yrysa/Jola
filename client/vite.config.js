import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
    //headers: {
     // 'Content-Security-Policy': 
       // "default-src 'self'; " +
      //  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
       // "font-src 'self' https://fonts.gstatic.com; " +
       // "script-src 'self' 'unsafe-inline'; " +
       // "img-src 'self' data: https:; " +
      //  "connect-src 'self' http://localhost:5000;",
    },
  //},
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['framer-motion', 'lottie-react'],
        },
      },
    },
  },
});