import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // In development, forward /api requests to Express. The browser only ever
    // talks to localhost:5173, so it behaves exactly like production
    // (one origin, no CORS, first-party cookies).
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
