import fs from 'node:fs';

// Workaround for Windows sandbox environment where fs.realpathSync.native throws EPERM
try {
  if (fs.realpathSync && fs.realpathSync.native) {
    fs.realpathSync.native = fs.realpathSync;
  }
} catch {
  // Ignore
}

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

function copyExtensionAssets() {
  return {
    name: 'copy-extension-assets',
    closeBundle() {
      if (!fs.existsSync('dist')) {
        fs.mkdirSync('dist', { recursive: true });
      }
      if (fs.existsSync('manifest.json')) {
        fs.copyFileSync('manifest.json', 'dist/manifest.json');
      }
      if (fs.existsSync('icons')) {
        if (!fs.existsSync('dist/icons')) {
          fs.mkdirSync('dist/icons', { recursive: true });
        }
        for (const file of fs.readdirSync('icons')) {
          fs.copyFileSync(resolve('icons', file), resolve('dist/icons', file));
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyExtensionAssets()],
  resolve: {
    preserveSymlinks: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'sidepanel.html'),
        options: resolve(__dirname, 'options.html'),
        background: resolve(__dirname, 'src/extension/background/index.ts'),
        guard: resolve(__dirname, 'src/extension/guard/index.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background.js';
          if (chunkInfo.name === 'guard') return 'guard.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});
