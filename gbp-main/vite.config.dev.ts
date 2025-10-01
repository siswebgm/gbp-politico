import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

// Development build configuration - no minification
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  resolve: {
    alias: [
      {
        find: '@',
        replacement: path.resolve(__dirname, 'src')
      },
      {
        find: '@components',
        replacement: path.resolve(__dirname, 'src/components')
      },
      {
        find: '@hooks',
        replacement: path.resolve(__dirname, 'src/hooks')
      },
      {
        find: '@lib',
        replacement: path.resolve(__dirname, 'src/lib')
      },
      {
        find: '@pages',
        replacement: path.resolve(__dirname, 'src/pages')
      },
      {
        find: '@services',
        replacement: path.resolve(__dirname, 'src/services')
      }
    ]
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    },
    include: [
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/icons-material',
      '@mui/material/styles',
      '@mui/material/colors',
      '@mui/lab',
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime'
    ]
  },
  build: {
    sourcemap: false,
    minify: false, // No minification
    target: 'es2020',
    rollupOptions: {
      output: {
        // Simple chunking strategy
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'firebase': ['firebase'],
        },
      },
    },
    chunkSizeWarningLimit: 2000,
  },
});