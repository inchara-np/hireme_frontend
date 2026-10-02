import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Build-time render modes.
 *
 * The app is deployed to Cloudflare Workers as static assets only — no Node
 * server ever runs (see `wrangler.jsonc` and the SSR section of the README).
 * So there are exactly two valid options here:
 *
 *   Prerender — the five public marketing routes. Emitted as real HTML at
 *               build time, which is what makes the site indexable.
 *   Client    — `admin/**`. It is behind a login, needs no SEO, and depends on
 *               a browser-only token in localStorage. This matches how it
 *               already behaved in production; it was previously declared as
 *               RenderMode.Server, which nothing was ever there to execute.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: 'admin/**',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
