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

// Routes met persoonsgegevens/foto's — vereisen HTTP Basic Auth.
// Wachtwoord staat NIET in de repo: zet 'm als Worker secret (zie HANDOFF.md).
const PROTECTED_PATHS = new Set(['/api/inzendingen-7kq4m9', '/api/foto-7kq4m9']);

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isAuthorized(request, env) {
  if (!env.DASHBOARD_PASSWORD) return false; // fail closed als secret ontbreekt
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Basic ')) return false;
  try {
    const [, password] = atob(header.slice(6)).split(':');
    return timingSafeEqual(password || '', env.DASHBOARD_PASSWORD);
  } catch {
    return false;
  }
}

function unauthorized() {
  return new Response('Authenticatie vereist', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Vintage Camera Inkoop dashboard"' },
  });
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);

    if (PROTECTED_PATHS.has(pathname) && !isAuthorized(request, env)) {
      return unauthorized();
    }

    const route = ROUTES.find((r) => r.method === request.method && r.path === pathname);
    if (route) return route.handler({ request, env, ctx });
    return env.ASSETS.fetch(request);
  },
};
