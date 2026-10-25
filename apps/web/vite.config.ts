import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { rmSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

/** The MSW service worker exists for development mocks only; keep it out of what production serves. */
const dropMockWorker = (): Plugin => {
  let outDir = 'dist'
  return {
    name: 'drop-mock-worker',
    apply: 'build',
    configResolved: (config) => {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle: () => rmSync(resolve(outDir, 'mockServiceWorker.js'), { force: true }),
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), dropMockWorker()],
  server: {
    // changeOrigin stays off so the API sees the browser's own Host header, as it would behind a well-configured proxy.
    proxy: { '/api': { target: process.env.API_URL ?? 'http://localhost:3000', changeOrigin: false } },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
  },
})
