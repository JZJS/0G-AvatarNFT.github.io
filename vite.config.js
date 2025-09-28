import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      protocolImports: true,
      include: [
        'buffer', 'process', 'util', 'events', 'stream', 'path', 'crypto'
      ]
    })
  ],
  resolve: {
    alias: {
      '@': '/src',
      path: 'path-browserify',
      crypto: 'crypto-browserify',
      '0g-indexer': '/node_modules/@0glabs/0g-ts-sdk/lib.esm/indexer/Indexer.js',
      '0g-blob': '/node_modules/@0glabs/0g-ts-sdk/lib.esm/file/Blob.js'
    }
  },
  server: {
    https: false,
    hmr: { protocol: 'ws' }
  }
})
