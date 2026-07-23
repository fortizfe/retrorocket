import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    host: true,
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