/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    // Exclude Playwright specs — they run via `npm run test:e2e`, not Vitest
    exclude: ['**/node_modules/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**'],
      reporter: ['text', 'lcov'],
    },
  },
})
