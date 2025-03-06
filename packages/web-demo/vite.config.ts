import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'vite-plugin-fs'

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  resolve: {
    alias: {
      'pardal': resolve(__dirname, '../pardal/src'),
      'fs': 'vite-plugin-fs/browser'
    }
  },
  plugins: [
    fs()
  ]
}); 