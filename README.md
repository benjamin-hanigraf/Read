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

## Bible data

Both Bibles are loaded once at startup (`src/data/bible.js`) and cached by the service worker for offline use.
Format: `{ "Genesis": [ ["verse 1", "verse 2", ...], ...chapters ], ... }` (about 1.2 MB and 1.5 MB gzipped).

- **English (ESV):** `public/data/en.json`, extracted from the ESV PDF with fonts used to drop section headings,
  psalm titles, footnotes and footnote markers: `pip install pymupdf && python3 scripts/build-esv.py "ESV Bible.pdf"`.
  It needs `public/data/ta.json` present, to avoid mistaking figures such as "120,000" for verse numbers.
- **Tamil:** `public/data/ta.json`, from the Tamil Bible SQLite file (Tamil letters shifted to 2-byte characters to
  save space): `node scripts/build-tamil.mjs path/to/tamil_bible_new.sqlite` (Node 22+).
