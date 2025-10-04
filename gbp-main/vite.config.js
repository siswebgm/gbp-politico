import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    strictPort: true,
    hmr: {
      overlay: true
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@mui/material': path.resolve(__dirname, 'node_modules/@mui/material'),
      '@mui/icons-material': path.resolve(__dirname, 'node_modules/@mui/icons-material'),
      '@emotion/react': path.resolve(__dirname, 'node_modules/@emotion/react'),
      '@emotion/styled': path.resolve(__dirname, 'node_modules/@emotion/styled')
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    },
    include: [
      'react',
      'react-dom',
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/icons-material',
      '@mui/material/styles',
      '@mui/material/colors',
      '@mui/lab'
    ]
  },
  build: {
    // Reduce memory usage during build
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Node modules
          if (id.includes('node_modules')) {
            // React and related
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react'
            }
            // Radix UI components
            if (id.includes('@radix-ui')) {
              return 'vendor-radix'
            }
            // MUI components
            if (id.includes('@mui')) {
              return 'vendor-mui'
            }
            // AWS SDK
            if (id.includes('@aws-sdk')) {
              return 'vendor-aws'
            }
            // Charts
            if (id.includes('chart') || id.includes('recharts')) {
              return 'vendor-charts'
            }
            // Maps
            if (id.includes('leaflet')) {
              return 'vendor-maps'
            }
            // Utils
            if (id.includes('axios') || id.includes('lodash') || id.includes('date-fns')) {
              return 'vendor-utils'
            }
            // Other vendor libraries
            return 'vendor-other'
          }
          // Local modules
          if (id.includes('/src/')) {
            // Components
            if (id.includes('/components/')) {
              return 'components'
            }
            // Pages
            if (id.includes('/pages/')) {
              return 'pages'
            }
            // Utils
            if (id.includes('/utils/') || id.includes('/lib/')) {
              return 'utils'
            }
          }
        },
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: '[ext]/[name]-[hash].[ext]',
      },
      maxParallelFileOps: 2,
      external: [],
    },
    chunkSizeWarningLimit: 2000,
  },
  // Environment variables for build optimization
  define: {
    __DEV__: false,
    __PROD__: true,
  }
})
