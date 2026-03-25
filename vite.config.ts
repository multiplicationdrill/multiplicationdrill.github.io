import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Use relative paths for GitHub Pages
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Vite 8: rollupOptions is deprecated, use rolldownOptions
    rolldownOptions: {
      input: {
        main: './index.html',
      },
    },
  },
});
