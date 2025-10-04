import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  resolve: {
    alias: [
      {
        find: '@',
        replacement: './src'
      },
      {
        find: '@components',
        replacement: './src/components'
      },
      {
        find: '@hooks',
        replacement: './src/hooks'
      },
      {
        find: '@lib',
        replacement: './src/lib'
      },
      {
        find: '@pages',
        replacement: './src/pages'
      },
      {
        find: '@services',
        replacement: './src/services'
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
    // Force development mode settings
    sourcemap: false,
    minify: false,
    target: 'es2015',
    cssMinify: false,
    // Disable all optimizations
    rollupOptions: {
      output: {
        // No chunking at all - single file
        manualChunks: undefined,
        inlineDynamicImports: true,
        // Preserve original names
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      },
      // Disable tree shaking
      treeshake: false,
    },

    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
}));
