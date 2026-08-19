import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['tests/integration/**/*.test.{ts,tsx}', 'tests/integration/**/*.spec.{ts,tsx}'],
  },
});
