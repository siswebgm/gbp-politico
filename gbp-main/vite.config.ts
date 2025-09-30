import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
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
      // Enable esbuild polyfill for Node.js globals and built-ins
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
    // Production optimizations
    sourcemap: mode === 'development',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'utils-vendor': ['axios', 'lodash', 'date-fns', 'dayjs'],
          'firebase-vendor': ['firebase', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
}));
