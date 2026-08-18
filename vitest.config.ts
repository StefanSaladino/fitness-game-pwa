import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],

    // Vitest owns unit/component tests under src/.
    // Playwright owns tests/e2e/ and must not be collected here.
    include: [
      'src/**/*.test.{ts,tsx}',
      'src/**/*.spec.{ts,tsx}',
    ],

    exclude: [
      'tests/e2e/**',
      'node_modules/**',
      'dist/**',
    ],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/domain/**/*.ts'],
      exclude: ['src/domain/**/__tests__/**', 'src/domain/index.ts'],
      thresholds: {
        lines: 95,
        functions: 95,
        statements: 95,
        branches: 90,
      },
    },
  },
});