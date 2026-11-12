import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // The Firebase SDK alone is ~600 kB minified; that's expected for this app.
    chunkSizeWarningLimit: 900,
  },
});
