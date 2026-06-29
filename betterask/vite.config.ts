import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import webExtension from 'vite-plugin-web-extension'

export default defineConfig({
  plugins: [
    react(),
    webExtension({
      manifest: 'manifest.json',
      watchFilePaths: ['manifest.json', 'package.json'],
      additionalInputs: ['src/dashboard/index.html'],
    }),
  ],
  build: {
    sourcemap: false,
    minify: false,
  },
})
