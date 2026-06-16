# Valahatti Technologies — Frontend

Angular marketing site and admin panel for [valahatti-tech.com](https://valahatti-tech.com).

**Backend repo:** [hireme_backend](https://github.com/inchara-np/hireme_backend)

## Local development

```bash
npm install
npm start
```

Site: `http://localhost:4200` (proxies API to `localhost:8080`)

## Production (Cloudflare Pages — free tier)

### 1. Deploy

1. [Cloudflare Pages](https://dash.cloudflare.com) → **Create → Pages** → connect this repo
2. Build settings:

| Setting | Value |
|---------|-------|
| Build command | `npm install && npm run build` |
| Output directory | `dist/frontend/browser` |
| Node version | `20` |

3. Deploy → you get `https://hireme-frontend.pages.dev` (or similar)

### 2. Custom domain

In Cloudflare Pages → **Custom domains** → add:

- `valahatti-tech.com`
- `www.valahatti-tech.com`

If your domain is already on Cloudflare, DNS is automatic. Otherwise point nameservers to Cloudflare and add the records Pages suggests.

### 3. API URL

Production API is configured in `src/environments/environment.production.ts`:

```
https://api.valahatti-tech.com/api/v1
```

Deploy the [backend](https://github.com/inchara-np/hireme_backend) first and set up `api.valahatti-tech.com` before going live.

## Admin panel

| Item | Value |
|------|-------|
| URL | `https://valahatti-tech.com/admin/login` |
| Email | `ADMIN_EMAIL` from backend `.env` |
| Password | `ADMIN_PASSWORD` from backend `.env` |

## Build

```bash
npm run build
```

Output: `dist/frontend/browser`
