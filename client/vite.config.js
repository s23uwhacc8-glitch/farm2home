import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'build',
    sourcemap: false,
    // Split vendor chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // React ecosystem in its own chunk
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // Axios separately — changes rarely
          http: ['axios'],
        },
      },
    },
    // Warn if any single chunk exceeds 500 kB
    chunkSizeWarningLimit: 500,
  },

  // Optimise deps pre-bundling for faster cold starts
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios'],
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.jsx'],
  },
});
