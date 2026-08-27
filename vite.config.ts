import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const includeReliabilityFixture = process.env.FITNESS_E2E_RELIABILITY === '1';

function assetManifestPlugin(): Plugin {
  return {
    name: 'fitness-asset-manifest',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle)
        .filter((fileName) => fileName.startsWith('assets/'))
        .map((fileName) => `/${fileName}`)
        .sort();

      this.emitFile({
        type: 'asset',
        fileName: 'asset-manifest.json',
        source: `${JSON.stringify({ assets }, null, 2)}\n`,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), assetManifestPlugin()],
  build: {
    target: 'es2022',
    rolldownOptions: {
      ...(includeReliabilityFixture ? {
        input: {
          app: resolve(process.cwd(), 'index.html'),
          reliability: resolve(process.cwd(), 'reliability.e2e.html'),
          competition: resolve(process.cwd(), 'competition.e2e.html'),
          groups: resolve(process.cwd(), 'groups.e2e.html'),
          indexeddb: resolve(process.cwd(), 'indexeddb.e2e.html'),
          progress: resolve(process.cwd(), 'progress.e2e.html'),
          cardio: resolve(process.cwd(), 'cardio.e2e.html'),
          appComposition: resolve(process.cwd(), 'app-composition.e2e.html'),
          userAdministration: resolve(process.cwd(), 'user-administration.e2e.html'),
        },
      } : {}),
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/,
              priority: 20,
            },
            {
              name: 'supabase-vendor',
              test: /node_modules[\\/]@supabase[\\/]/,
              priority: 15,
            },
          ],
        },
      },
    },
  },
});
