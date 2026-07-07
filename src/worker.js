// Cloudflare Worker entry point (see wrangler.toml `main`).
//
// This project is deployed as a Worker with static assets, not Cloudflare
// Pages — so the file-based routing in functions/api/*.js is NOT picked up
// automatically (that convention only works on Pages). This router imports
// those same handlers and dispatches to them manually, then falls back to
// serving the built site via the ASSETS binding for everything else.
import { onRequestPost as submitPost } from '../functions/api/submit.js';
import { onRequestGet as inzendingenGet } from '../functions/api/inzendingen-7kq4m9.js';
import { onRequestGet as fotoGet } from '../functions/api/foto-7kq4m9.js';

const ROUTES = [
  { method: 'POST', path: '/api/submit', handler: submitPost },
  { method: 'GET', path: '/api/inzendingen-7kq4m9', handler: inzendingenGet },
  { method: 'GET', path: '/api/foto-7kq4m9', handler: fotoGet },
];

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    const route = ROUTES.find((r) => r.method === request.method && r.path === pathname);
    if (route) return route.handler({ request, env, ctx });
    return env.ASSETS.fetch(request);
  },
};
