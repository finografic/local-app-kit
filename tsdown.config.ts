import { defineConfig } from 'tsdown';

export default defineConfig({
  // `exports` in package.json is written by hand: tsdown's generated map drops `types` for ESM-only
  // output, which breaks TypeScript under `moduleResolution: bundler`.
  exports: false,
  entry: {
    'index': 'src/index.ts',
    'ui-state': 'src/ui-state/index.ts',
    'react': 'src/react/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'esnext',
  external: ['react'],
});
