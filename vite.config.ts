import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';

/** 개발 서버에서 /api/* 를 Vercel 함수와 같은 server/http.ts 처리기로 보낸다(다온 사주 localApi 와 같은 방식). */
function localApi(env: Record<string, string>): Plugin {
  const routes: Record<string, string> = { '/api/check': 'handleCheck', '/api/packs': 'handlePacks' };
  return {
    name: 'lease-clause-check-local-api',
    configureServer(server: ViteDevServer) {
      Object.assign(process.env, env);
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const handler = routes[url.pathname];
        if (!handler) return next();
        try {
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
          const request = new Request(url, {
            method: req.method,
            headers,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
          });
          const mod = await server.ssrLoadModule('/server/http.ts');
          const response: Response = await mod[handler](request);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (e) {
          console.error('[local-api]', e);
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: '개발 서버에서 문제가 생겼어요.' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), localApi(env)],
    server: { port: 5193, strictPort: true },
  };
});
