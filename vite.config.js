import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // allow opening dist/index.html directly from filesystem
  resolve: {
    preserveSymlinks: true,
  },
});
