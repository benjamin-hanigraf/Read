# Read

A daily Bible reading plan, built as an installable, offline-capable PWA (React + Vite + vite-plugin-pwa).

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build + service worker in dist/
npm run preview    # serve the production build locally
```

## Project layout

- `src/App.jsx` – the app (from the original prototype)
- `src/data/` – bundled sample Bible text, Tamil sample, book names and daily line art
- `public/icons/` – PWA icons generated from the Read logo
- `vite.config.js` – PWA manifest + service worker (precaches everything for offline use)
- `vercel.json` – Vercel config (no-cache headers for the service worker and manifest)

## Deploy on Vercel

1. Go to https://vercel.com/new and import this GitHub repository.
2. Framework preset: **Vite** (auto-detected). Build command `npm run build`, output directory `dist`.
3. Click **Deploy**. Every push to the main branch redeploys automatically.

## Install on a phone

- **iPhone (Safari):** open the site → Share → **Add to Home Screen**.
- **Android (Chrome):** menu → **Install app**.
