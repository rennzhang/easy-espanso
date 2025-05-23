const { defineConfig } = require('electron-vite');
const vue = require('@vitejs/plugin-vue');
const path = require('path');

module.exports = defineConfig({
  main: {
    build: {
      outDir: 'dist/electron/main',
      rollupOptions: {
        external: ['electron', 'electron-devtools-installer']
      },
      lib: {
        entry: 'electron/main/index.js'
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    }
  },
  preload: {
    build: {
      outDir: 'dist/electron/preload',
      lib: {
        entry: 'electron/preload/index.js'
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    }
  },
  renderer: {
    root: '.',
    base: './',
    build: {
      outDir: 'dist/electron/renderer',
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'index.html')
        }
      }
    },
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    server: {
      host: true
    }
  }
}); 