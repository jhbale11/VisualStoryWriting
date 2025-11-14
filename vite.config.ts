import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    outDir: 'build',
    minify: 'esbuild',
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis for LangChain
      define: {
        global: 'globalThis',
      },
    },
  },
})
