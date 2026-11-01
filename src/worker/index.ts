import { createPortfolioApp, WorkerBindings } from './api';

const app = createPortfolioApp();

// Fallback to Cloudflare Static Assets (Vite frontend in ./dist with SPA routing support)
app.all('*', async (c) => {
  if (c.env?.ASSETS) {
    const url = new URL(c.req.url);
    // Static assets with extensions (.js, .css, .png, .svg, .json) served directly
    if (url.pathname.includes('.') && !url.pathname.endsWith('.html')) {
      return await c.env.ASSETS.fetch(c.req.raw);
    }
    // SPA routes (/admin, /admin/skills, etc.) serve /index.html
    const indexUrl = new URL('/index.html', c.req.url).toString();
    const indexReq = new Request(indexUrl, {
      method: 'GET',
      headers: c.req.raw.headers,
    });
    const indexRes = await c.env.ASSETS.fetch(indexReq);
    if (indexRes.ok || indexRes.status === 304) {
      return indexRes;
    }
    return await c.env.ASSETS.fetch(c.req.raw);
  }
  return c.text('Ravi Dasari Portfolio — Cloudflare Edge Worker API', 200);
});

export default app;
export type { WorkerBindings };
