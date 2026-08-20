import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const includeReliabilityFixture = process.env.FITNESS_E2E_RELIABILITY === '1';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    ...(includeReliabilityFixture ? {
      rollupOptions: {
        input: {
          app: resolve(process.cwd(), 'index.html'),
          reliability: resolve(process.cwd(), 'reliability.e2e.html'),
        },
      },
    } : {}),
  },
});
