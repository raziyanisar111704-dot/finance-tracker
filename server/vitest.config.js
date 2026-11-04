import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    // The first run downloads a MongoDB binary for the in-memory server.
    hookTimeout: 120_000,
    testTimeout: 20_000,
  },
});
