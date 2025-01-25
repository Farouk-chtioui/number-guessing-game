import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/number-guessing-game/',  // Changed back to repository name
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true
  }
});
