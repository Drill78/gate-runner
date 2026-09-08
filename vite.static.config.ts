import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath } from 'node:url';

// Portable static delivery for Vercel, Netlify and other static hosts.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  css: { postcss: { plugins: [tailwindcss()] } },
  server: {
    proxy: {
      '/api/chronicle': {
        target: 'https://ashen-gates-zhour.green-salnut.chatgpt.site',
        changeOrigin: true,
      },
    },
  },
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: false },
});
