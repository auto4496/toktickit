import { realpathSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv, searchForWorkspaceRoot } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', '');
  const apiUrl = env.VITE_API_URL || `http://localhost:${env.PORT || '5000'}`;

  return {
    envDir: '..',
    plugins: [react()],
    server: {
      // Linked dependency directories must also serve their installed font assets.
      fs: { allow: [searchForWorkspaceRoot(process.cwd()), realpathSync(path.resolve('node_modules'))] },
      port: 3000,
      open: false,
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
        },
      },
    },
  };
});
