/// <reference types="node" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from https://timlightson.github.io/quizbuddy-web/, so assets need the
// repo name as a base. Routing is hash-based, which means Pages needs no
// rewrite rules and deep links survive a refresh.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/quizbuddy-web/' : '/',
  plugins: [react()],
  server: { port: 5173 },
  build: { chunkSizeWarningLimit: 700 },
})
