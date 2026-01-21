import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: process.env.VITE_BASE_PATH || '/',
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
      },
      plugins: [react()],
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
