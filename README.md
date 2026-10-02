# Valahatti Technologies — Frontend

Angular 19 marketing site and admin panel for [valahatti-tech.com](https://valahatti-tech.com),
deployed to Cloudflare Workers as **static assets**.

**Backend repo:** [hireme_backend](https://github.com/inchara-np/hireme_backend)

---

## Quick start

```bash
npm install
npm start          # http://localhost:4200, proxies /api and /uploads to :8080
```

| Command | What it does |
|---|---|
| `npm start` | Dev server with API proxy (`proxy.conf.json`) |
| `npm run build` | Production build **+ regenerates the CSP script hashes** |
| `npm run build:only` | Production build without the CSP step |
| `npm test` | Karma in watch mode |
| `npm run test:ci` | Headless Chrome, single run (used by CI) |
| `npm run lint` | ESLint over `src/**/*.ts` and `src/**/*.html` |
| `npm run lint:fix` | Same, with autofix |
| `npm run deploy` | Build then `wrangler deploy` |
| `npm run preview` | Build then `wrangler dev` |
| `npm run brand:logo` | Regenerate logo/OG images from the design source |
| `npm run csp:hashes` | Print the inline-script hashes for `_headers` |

Build output: `dist/frontend/browser` (this is what `wrangler.jsonc` serves).

---

## Rendering & deployment model

**The site is prerendered to static HTML at build time. There is no server.**

| Routes | Render mode | Result |
|---|---|---|
| `/`, `/services`, `/student-projects`, `/freelance-services`, `/contact` | `RenderMode.Prerender` | Real HTML files emitted at build time |
| `admin/**` | `RenderMode.Client` | Rendered in the browser only |

Configured in `src/app/app.routes.server.ts`, with `"outputMode": "static"` in
`angular.json`.

### Why the SSR server was removed

The project previously shipped an Express SSR server (`src/server.ts`) and built
a `server.mjs` bundle. **Cloudflare Workers never invoked it** — the deployment
is assets-only, so every request was already served as a static file or the SPA
fallback. `admin/**` was declared `RenderMode.Server`, but nothing existed to
execute that, so in practice it always rendered client-side anyway.

Rather than half-supporting a server that never ran:

- `admin/**` is now honestly declared `RenderMode.Client` — matching production
  behaviour, and admin needs no SEO.
- `src/server.ts` was deleted, along with the `ssr` block in `angular.json` and
  the `serve:ssr:frontend` script.
- `express` and `@types/express` were removed from `package.json`. Express now
  appears only as a transitive dev dependency of `webpack-dev-server`, so it
  never reaches production. This removed the whole Express/body-parser CVE
  surface rather than leaving it dormant.
- `src/main.server.ts` and `src/app/app.config.server.ts` **stay** — the
  prerenderer needs them. They run at build time only.

Verify after any change:

```bash
npm run build
ls dist/frontend/browser/*/index.html   # 4 sub-routes + index.html at the root
```

CI asserts this explicitly (see `.github/workflows/ci.yml`).

### Hydration, and why admin opts out

`provideClientHydration(withEventReplay())` is enabled for the prerendered
public routes. It is **deliberately skipped on `/admin/**`** — see `src/main.ts`.

Reason: `wrangler.jsonc` uses `not_found_handling: "single-page-application"`,
so a hard load of `/admin/leads/123` is served the prerendered **homepage**
HTML. Hydrating that markup into a completely different component tree causes
NG0500 mismatch errors and a visible re-render. On admin URLs `main.ts` clears
the shell and boots as a plain client-side app instead.

Because of the same SPA fallback, an unknown URL returns HTTP **200** with the
`NotFoundComponent` rendered, not a hard 404. The page emits `noindex, nofollow`
so search engines will not index it. If you ever want a true 404 status you need
a small Worker script in front of the assets binding; that is the only way with
this hosting model, and it would break `/admin/*` deep links unless it
special-cases them.

---

## SEO

This was the main goal of the last pass. What exists now:

### `SeoService` — `src/app/core/services/seo.service.ts`

One call per route sets, together:

- `<title>` (page title + ` | Valahatti Technologies`)
- `<meta name="description">`
- `<link rel="canonical">` — **upserted**, never duplicated
- `robots` (`index, follow, max-image-preview:large…` or `noindex, nofollow`)
- the full Open Graph set (`og:title`, `og:description`, `og:url`, `og:type`,
  `og:site_name`, `og:locale`, `og:image` + dimensions + alt)
- the Twitter card set (`summary_large_image`)
- optional `keywords`, removed again when a page does not supply them

Each of the five public route components calls it from `ngOnInit` with copy
written specifically for that page. Every admin route calls
`seo.setNoIndex(...)`.

### Canonical URLs

Canonicals are always built against `environment.siteUrl`
(`https://valahatti-tech.com`, the apex), regardless of the host the visitor
arrived on, and **query strings and fragments are stripped**. This matters
because `/contact?type=freelance` and `/contact?type=business` are the same page
with different copy — they all canonicalise to `https://valahatti-tech.com/contact`
so they cannot compete with each other in search results.

> ⚠️ **Manual step required:** Cloudflare still needs a dashboard redirect rule
> sending `www.valahatti-tech.com` → the apex. Canonical tags are a hint, not a
> redirect. See [Owner action items](#owner-action-items).

### Static files

| File | Purpose |
|---|---|
| `public/robots.txt` | `Allow: /`, `Disallow: /admin/`, points at the sitemap |
| `public/sitemap.xml` | The 5 public routes with `<lastmod>` |

Update `<lastmod>` when a page's content genuinely changes. Bumping every date
on every deploy just trains crawlers to ignore the signal.

### Structured data

`src/index.html` carries JSON-LD for `Organization` and `WebSite`.

`sameAs` is **intentionally absent**. It should list confirmed social profile
URLs, and none were available. Invented profile links would poison the Google
knowledge panel. Add the array once real URLs exist:

```jsonc
"sameAs": [
  "https://www.linkedin.com/company/…",
  "https://github.com/…"
]
```

---

## Security headers — `public/_headers`

Cloudflare reads this file at deploy time; it is never served to visitors.

- **Caching** — one year `immutable` for content-hashed `.js`/`.css` (Angular
  fingerprints filenames, so a changed file is always a changed URL); a week for
  stable-named images; `max-age=0, must-revalidate` for HTML; `no-store` for
  `/admin/*`.
- **Security** — `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `Strict-Transport-Security` (1 year, `includeSubDomains; preload`),
  `X-Frame-Options: DENY`, `Cross-Origin-Opener-Policy`, and a minimal
  `Permissions-Policy` that denies camera, mic, geolocation and friends.
- **CSP** — `default-src 'self'` with explicit allowances for the Google Fonts
  hosts and the configured API origin (`https://api.valahatti-tech.com`).

### The CSP script hashes maintain themselves

`script-src` uses **hashes, not `'unsafe-inline'`**. Three inline scripts end up
in the prerendered HTML:

1. the theme bootstrap in `src/index.html` (prevents a white flash in dark mode),
2. Angular's `ng-event-dispatch-contract` runtime (from `withEventReplay()`),
3. a per-page `__jsaction_bootstrap(...)` call, whose contents depend on which
   DOM events that page's template binds.

Because (3) differs per page and changes whenever templates change, `npm run
build` runs `tools/csp-hashes.js --write` automatically and rewrites the
directive in `dist/frontend/browser/_headers`. **You never need to do this by
hand.** `npm run csp:hashes` prints the current values if you want to refresh
the committed `public/_headers` copy.

If you ever hand-edit templates and deploy `dist/` without a fresh build, the
hashes and the HTML will disagree and scripts will be blocked — always deploy
the output of `npm run build`.

> **Note on outbound WhatsApp links:** `https://wa.me/...` links are ordinary
> top-level navigations. CSP has no shipped directive that restricts those
> (`navigate-to` was never implemented by browsers), so no allowance is needed —
> they work under the policy as written.

> **If `_headers` is ignored:** Workers static assets support `_headers`, but if
> a future Cloudflare change breaks that, the fallback is to recreate these as
> **Transform Rules → Modify Response Header** in the dashboard.

---

## Design system

All colour, type, spacing, radius, shadow and motion values live as CSS custom
properties in **`src/styles/_tokens.scss`**. Components read from those tokens
and must not hardcode hex values. (Two documented exceptions: the `<select>`
chevron, which is a `data:` URI that cannot read a custom property, and the
WhatsApp brand green, which belongs to a third party.)

```
src/styles/
  _tokens.scss       colour (light + dark), type scale, space, radius, motion
  _base.scss         reset, document defaults, headings, focus, scroll reveal
  _mixins.scss       breakpoints, focus ring, card levels, kicker, blueprint grid
  _components.scss   buttons, cards, chips, badges, forms, alerts, panels
src/styles.scss      imports the above, in that order
```

Component stylesheets get the mixins via
`stylePreprocessorOptions.includePaths` in `angular.json`:

```scss
@use 'mixins' as *;
```

**Palette:** Signal Navy (`#183d89`, the logo's exact navy) for structure and
links; Circuit Amber (`#f8a102`, the logo's exact amber) reserved almost
entirely for calls to action; neutrals biased toward 222° rather than flat grey.
Dark mode is a separate ramp, not an inversion.

**Type:** Bricolage Grotesque (display/headings) + Public Sans (body) +
IBM Plex Mono (small uppercase labels, tech chips, numerals), all from Google
Fonts with `preconnect` in `src/index.html`.

**Theming:** `ThemeService` follows the OS preference until the visitor makes an
explicit choice, then respects that. A tiny inline script in `index.html` applies
the theme class before first paint so dark-mode visitors never see a white flash.

**Accessibility:** all body and hint text meets WCAG AA (≥4.5:1) in both themes;
every interactive element has a visible focus ring; all motion is wrapped in
`prefers-reduced-motion` guards; layouts hold down to 360px.

---

## Images

`public/logo.png` was a **1,039 KB** 1536×1024 PNG with the transparency
checkerboard **baked in as real pixels** (it had no alpha channel at all), and
it was being used both as a ~44px logo and as the `<link rel="icon">`.

Regenerated with `sharp` via `tools/brand/build-logo.js`:

| File | Size | Used for |
|---|---|---|
| `logo.png` | 128×128, **2.6 KB** | navbar, admin sidebar, login, footer |
| `logo-192.png` | 192×192, 4.6 KB | PWA / rich results |
| `logo-512.png` | 512×512, 27 KB | `schema.org` organisation logo |
| `apple-touch-icon.png` | 180×180, 3.9 KB | iOS home screen |
| `og-image.png` | 1200×630, 45 KB | Open Graph / Twitter cards |

That is a **99.7% reduction** on the asset every page loads. The favicon now
points at the existing `public/favicon.ico`.

The original artwork is preserved at `tools/brand/logo-source.png`. To
regenerate after a logo change, drop the new source there and run:

```bash
npm install --no-save sharp
npm run brand:logo
```

The script keys out the checkerboard into a real alpha channel, trims to the
artwork bounding box, and emits every size. If you ever get a proper vector
source from the designer, an SVG would be better still for the in-app mark.

---

## Project structure

```
src/app/
  core/
    constants/      API endpoint paths
    guards/         authGuard, guestGuard (+ specs)
    interceptors/   authInterceptor, httpErrorInterceptor (+ specs)
    models/         lead.model.ts (types/statuses/pagination), app-error.model.ts
    services/       auth, lead, upload, theme, whatsapp, seo
  features/
    home/ services/ student-projects/ freelance-services/ contact/ not-found/
    admin/          admin.routes.ts + login, dashboard, leads, lead-details
  layouts/admin-layout/
  shared/
    components/     navbar, footer, page-header, theme-toggle, whatsapp-button, alert
    directives/     reveal.directive.ts (scroll reveal, reduced-motion aware)
    utils/          form-errors.ts (shared validation copy)
```

**All routes are lazy** (`loadComponent` / `loadChildren`). The entire `admin`
subtree is one chunk behind `loadChildren`, so public visitors never download
admin code — CI asserts this.

### Error handling

`httpErrorInterceptor` normalises every failed request into an `AppError` with a
`kind` (`network`, `validation`, `rateLimit`, `server`, …). Components switch on
that instead of reading raw status codes, and override only the wording that is
genuinely page-specific:

```ts
this.submitError.set(
  errorMessage(error, {
    network: "We couldn't reach the server. …or message us on WhatsApp instead."
  })
);
```

All loading/success/error states render through the shared `<app-alert>`
component.

### Admin leads pagination

`GET /admin/leads` returns a paginated envelope:

```json
{ "data": [...], "page": 1, "page_size": 25, "total": 143, "total_pages": 6 }
```

`LeadService.getLeads(page, pageSize)` sends `?page=&pageSize=` and normalises
the response. It also tolerates a bare array, so a rolling backend deploy cannot
white-screen the admin panel.

The leads list has Previous/Next controls, a "Showing 26–50 of 143" range, and a
25/50/100 page-size selector.

**Known limitation:** the lead-type filter chips filter the **loaded page only**,
because the API exposes no server-side type filter. The UI says so explicitly
rather than implying the counts cover all results. If the backend later adds a
`?leadType=` parameter, move the filter server-side and the caveat goes away.

---

## Testing & CI

137 unit tests covering: `AuthService` token-expiry logic, both route guards,
both interceptors, `SeoService` (canonicalisation, robots, OG/Twitter), and the
three lead-capture forms' validation and submit paths, plus the leads
pagination logic.

```bash
npm run test:ci
npm run lint
```

`.github/workflows/ci.yml` runs lint → tests → build on every push and PR, then
asserts that all five public routes emitted HTML containing a `<title>` and a
canonical link, and that admin code stayed out of the initial bundle.

`karma.conf.js` exists only to define `ChromeHeadlessNoSandbox`, which CI
containers need.

---

## Production deployment (Cloudflare Workers)

1. Cloudflare Dashboard → **Workers & Pages** → connect the frontend repo.
2. Build command: `npm install && npm run build`
   Deploy command: `npx wrangler deploy`
   (or just set the build command to `npm install && npm run deploy`)
3. `wrangler.jsonc` serves `dist/frontend/browser` with SPA fallback — it needs
   **no changes**.
4. Custom domain: add `valahatti-tech.com`, then add the www→apex redirect rule
   below.

### API URL

Set in `src/environments/environment.production.ts`:

```
https://api.valahatti-tech.com/api/v1
```

If this ever changes, **also update the `connect-src` and `img-src` entries in
`public/_headers`**, or the CSP will block API calls and attachment previews.

### Admin panel

| Item | Value |
|---|---|
| URL | `https://valahatti-tech.com/admin/login` |
| Email | `ADMIN_EMAIL` from the backend `.env` |
| Password | `ADMIN_PASSWORD` from the backend `.env` |

---

## Owner action items

Things that cannot be done from code:

- [ ] **Cloudflare: `www` → apex redirect.** Dashboard → your domain → **Rules**
      → **Redirect Rules** → *Create rule*:
      - Name: `www to apex`
      - If: *Custom filter expression* → Field `Hostname`, Operator `equals`,
        Value `www.valahatti-tech.com`
      - Then: *Static* → `https://valahatti-tech.com` — **Preserve query string
        ✅**, Status code **301**
      - Deploy. Test: `curl -I https://www.valahatti-tech.com` → `301` to the apex.
      - Make sure a DNS record for `www` exists and is **proxied** (orange
        cloud), otherwise the rule never runs.
- [ ] **Google Search Console.** Add `https://valahatti-tech.com` as a *Domain*
      property, verify via the DNS TXT record, then submit
      `https://valahatti-tech.com/sitemap.xml`. Use *URL Inspection → Request
      indexing* on the homepage and `/student-projects` to get started.
- [ ] **Bing Webmaster Tools** — you can import directly from Search Console.
- [ ] **Analytics (optional).** Cloudflare Web Analytics is the lowest-friction
      option and needs no cookie banner. If you use Google Analytics instead,
      add `https://www.googletagmanager.com` to `script-src` **and**
      `https://*.google-analytics.com` to `connect-src` in `public/_headers`,
      or it will be silently blocked by the CSP.
- [ ] **Replace the placeholder WhatsApp number.** Both
      `src/environments/environment.ts` and `environment.production.ts` contain
      `919876543210`, which is clearly a placeholder. Every WhatsApp button and
      the footer link point at it.
- [ ] **Decide on a public contact email.** The footer and contact page
      deliberately do not show one, because no verified address was available —
      only the form and WhatsApp. Add one if you want it visible.
- [ ] **Add `sameAs` to the JSON-LD** in `src/index.html` once you have real
      LinkedIn/GitHub/Instagram profile URLs.
- [ ] **Confirm `_headers` took effect** after the first deploy:
      `curl -I https://valahatti-tech.com` should show
      `content-security-policy` and `strict-transport-security`. Then open the
      site and check the browser console for CSP violations.

---

## Known follow-ups

- **Angular 19 → 20+ major upgrade (scheduled, not done here).**
  `npm audit` reports high-severity advisories against `@angular/common`,
  `@angular/compiler` and `@angular/core`. **There is no patched 19.x release** —
  every advisory is `<= 19.2.25`, and 19.2.25 is the newest 19.x that exists.
  Angular 19 is past its support window, so the only real remediation is a major
  upgrade. That was explicitly out of scope for this pass. The dependency floors
  in `package.json` were pinned to the newest 19.x (`^19.2.25` / `^19.2.27`).
  Run `npx @angular/cli@20 update @angular/core@20 @angular/cli@20` when you
  schedule it, then repeat for 21 and 22 — Angular only supports one major at a
  time.
  Mitigating context: the app has no user-generated HTML rendering and does not
  use `HttpTransferCache` at runtime (no SSR server), so the `HttpTransferCache`
  advisories do not apply to this deployment.
- **No e2e tests.** Unit coverage is good, but nothing exercises a real browser
  journey (submit a lead → see it in the admin panel). Playwright would be the
  natural fit and could reuse the CI workflow.
- **True 404 status codes** would need a Worker script in front of the assets
  binding (see the rendering section).
- **Server-side lead-type filtering** — see the pagination limitation above.
- **`@angular/material` and `@angular/cdk` were removed.** They were installed
  with zero imports anywhere. The redesign is a bespoke token-driven system, and
  Material's theming layer would have fought it for no benefit. If you later
  need a complex primitive (a date picker, a virtual-scrolling table), prefer
  adding `@angular/cdk` alone — it is behaviour-only and does not impose
  Material's visual language.
