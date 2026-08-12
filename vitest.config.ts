import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // App.tsx is inside client/, which has its own node_modules. Force the UI
    // tests and ReactDOM to share the root React instance used by Vitest.
    dedupe: ['react', 'react-dom'],
  },
  test: {
    globals: true,
    environment: 'node',
    include: [
      'server/tests/**/*.test.ts',
      'client/tests/**/*.test.tsx',
    ],
  },
});
