import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,           // bind 0.0.0.0 for the live preview
    port: 5173,
    allowedHosts: true,   // allow the *.e2b.app preview host
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
});
