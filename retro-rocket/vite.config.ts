import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { readFileSync } from 'node:fs';

const { version: appVersion } = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    host: true,
    // Same-origin backend in local dev: proxy /api/* to the standalone Express
    // dev server (npm run dev:server), so first-party cookies behave as in prod
    // where /api/* is served by Vercel functions on the same domain (FR-002a).
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.SERVER_PORT ?? 3001}`,
        changeOrigin: false,
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
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    // Build-time app version, compared against the backend's /api/health version to
    // surface a "new version available" banner for stale clients (feature 017 T119).
    __APP_VERSION__: JSON.stringify(appVersion),
  },
});