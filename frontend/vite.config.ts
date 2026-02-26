import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Use env from loadEnv so `.env` values are respected at build time.
      base: env.VITE_BASE_PATH || './',
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
            '/sse': {
                target: 'http://localhost:8000',
                changeOrigin: true,
                secure: false,
            },
            '/mcp': {
                target: 'http://localhost:8000',
                changeOrigin: true,
                secure: false,
            },
             '/messages': {
                target: 'http://localhost:8000',
                changeOrigin: true,
                secure: false,
            }
        }
      },
      build: {
        outDir: '../FDocs/dist',
        emptyOutDir: true,
        rollupOptions: {
          output: {
            entryFileNames: 'f_docs.js',
            chunkFileNames: 'f_docs.js',
            assetFileNames: '[name].[ext]',
            manualChunks: undefined,
          }
        }
      },
      plugins: [
        react(),
        tailwindcss(),
        cssInjectedByJsPlugin(),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
