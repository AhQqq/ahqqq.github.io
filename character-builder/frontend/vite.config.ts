import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/character/',
  build: { outDir: '../../character', emptyOutDir: true },
})
