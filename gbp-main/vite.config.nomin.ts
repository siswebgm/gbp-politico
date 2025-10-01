import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

// Configuration specifically to avoid minification issues
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
    }
  },
  build: {
    // Completely disable minification and optimization
    minify: false,
    sourcemap: false,
    target: 'es2015',
    cssMinify: false,
    rollupOptions: {
      // Disable tree shaking completely
      treeshake: false,
      output: {
        // Single file output
        inlineDynamicImports: true,
        manualChunks: undefined,
        // Keep original names
        entryFileNames: 'main.js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        // Disable all optimizations
        compact: false,
        minifyInternalExports: false,
      },
      // Preserve all exports
      preserveEntrySignatures: 'strict',
    },
    chunkSizeWarningLimit: 10000,
  },
});