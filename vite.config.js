import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Vite config to build the popup React app into dist/
export default defineConfig({
  plugins: [react()],
  root: '.',
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': '{}',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false, // we'll copy other assets separately
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
      },
      output: {
        // Keep directory structure stable: dist/popup/*
        assetFileNames: ({ name }) => {
          if (!name) return 'assets/[name]-[hash][extname]';
          if (name.includes('popup')) return 'popup/[name]-[hash][extname]';
          if (name.includes('options')) return 'options/[name]-[hash][extname]';
          return 'assets/[name]-[hash][extname]';
        },
        chunkFileNames: (chunkInfo) => {
          // Place popup chunks under popup/
          // Use entry name prefix to route to folder
          const n = chunkInfo.name || '';
          if (n.startsWith('popup')) return 'popup/[name]-[hash].js';
          if (n.startsWith('options')) return 'options/[name]-[hash].js';
          return 'assets/[name]-[hash].js';
        },
        entryFileNames: (chunkInfo) => {
          const n = chunkInfo.name || '';
          if (n.startsWith('popup')) return 'popup/[name]-[hash].js';
          if (n.startsWith('options')) return 'options/[name]-[hash].js';
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
});
