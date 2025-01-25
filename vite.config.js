import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',  // Changed this line for simple deployment
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
