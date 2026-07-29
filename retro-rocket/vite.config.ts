import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    host: true,
    // Same-origin backend in local dev: proxy /api/* to the standalone Express
    // dev server (npm run dev:server), so first-party cookies behave as in prod
    // where /api/* is served by Vercel functions on the same domain (FR-002a).
    // ws: true is required so the retrospective board's WebSocket upgrade
    // (GET /api/retrospectives/:id/live, feature 019) is forwarded to the backend too —
    // without it, Vite's proxy only forwards plain HTTP requests, and the browser's
    // WebSocket connection closes immediately ("closed before the connection is
    // established") since nothing ever completes the upgrade handshake.
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.SERVER_PORT ?? 3001}`,
        changeOrigin: false,
        ws: true,
      },
    },
  },
  preview: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disabled for production
    minify: 'esbuild',
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:         ['react', 'react-dom', 'react-router-dom'],
          firebase:       ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          ui:             ['framer-motion', 'lucide-react', 'clsx'],
          dndkit:         ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          datepicker:     ['react-datepicker', 'date-fns'],
          'export-pdf':   ['@react-pdf/renderer'],
          'export-docx':  ['docx', 'file-saver'],
          i18n:           ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          transformers:   ['@huggingface/transformers'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
});