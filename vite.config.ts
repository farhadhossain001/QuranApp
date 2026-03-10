import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const serverlessPlugin = () => {
  return {
    name: 'serverless-proxy-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/prayer-time')) {
          try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const lat = url.searchParams.get('lat');
            const lng = url.searchParams.get('lng');
            const ISLAMIC_API_KEY = process.env.ISLAMIC_API_KEY || '3Z7SzW1uBjvE2S0pJjmJtyHF9fYZ9ficVNL2k2p9fMxhZhlR';

            const fetchUrl = `https://islamicapi.com/api/v1/prayer-time/?lat=${lat}&lon=${lng}&method=1&school=2&api_key=${ISLAMIC_API_KEY}`;

            const response = await fetch(fetchUrl);
            const data = await response.text();

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(data);
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message || 'Internal Error' }));
          }
          return;
        }

        if (req.url?.startsWith('/api/asma-ul-husna')) {
          try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const language = url.searchParams.get('language') || 'en';
            const ISLAMIC_API_KEY = process.env.ISLAMIC_API_KEY || '3Z7SzW1uBjvE2S0pJjmJtyHF9fYZ9ficVNL2k2p9fMxhZhlR';

            const fetchUrl = `https://islamicapi.com/api/v1/asma-ul-husna/?language=${language}&api_key=${ISLAMIC_API_KEY}`;

            const response = await fetch(fetchUrl);
            const data = await response.text();

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(data);
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message || 'Internal Error' }));
          }
          return;
        }

        if (req.url?.startsWith('/api/pdf-proxy')) {
          try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const targetUrl = url.searchParams.get('url');

            if (!targetUrl) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing url parameter' }));
              return;
            }

            const response = await fetch(targetUrl);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            res.setHeader('Content-Type', response.headers.get('content-type') || 'application/pdf');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(buffer);
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message || 'Internal Error fetch PDF' }));
          }
          return;
        }

        next();
      });
    }
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), serverlessPlugin()],
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
