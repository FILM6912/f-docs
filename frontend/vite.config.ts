import path from 'path';
import http from 'http';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // Dynamic CORS proxy plugin: /proxy/<host>:<port>/<path> -> http://<host>:<port>/<path>
    const dynamicProxyPlugin = () => ({
        name: 'dynamic-cors-proxy',
        configureServer(server: any) {
            server.middlewares.use('/proxy', (req: any, res: any) => {
                const m = (req.url || '').match(/^\/([^/]+)(\/.*)?$/);
                if (!m) {
                    res.statusCode = 400;
                    res.end('Bad proxy path');
                    return;
                }
                const target = `http://${m[1]}`;
                const targetPath = m[2] || '/';
                const fullUrl = `${target}${targetPath}`;
                const url = new URL(req.url as string, `http://${req.headers.host}`);
                proxyRequest(req, res, fullUrl, target, url);
            });
        },
    });

    function proxyRequest(req: any, res: any, fullUrl: string, target: string, url: URL) {
        const parsedTarget = new URL(target);
        const parsedFull = new URL(fullUrl);
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(req.headers)) {
            if (['host', 'connection', 'origin', 'referer'].includes(k)) continue;
            if (typeof v === 'string') headers[k] = v;
        }
        const options: any = {
            method: req.method,
            headers,
        };
        if (!['GET', 'HEAD'].includes(req.method || '') && req.headers['content-length'] === undefined) {
            options.headers['transfer-encoding'] = 'chunked';
        }
        const upstream = http.request(parsedFull, options, (upstreamRes: any) => {
            res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
            upstreamRes.pipe(res);
        });
        upstream.on('error', (err: any) => {
            console.error(`[dynamic-cors-proxy] ${err.message} for ${fullUrl}`);
            if (!res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'text/plain' });
            }
            res.end(`Proxy error: ${err.message}`);
        });
        req.pipe(upstream);
    }

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
        dynamicProxyPlugin(),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
