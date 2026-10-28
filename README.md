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

- `src/theme.js` – the accent colour, defined once: change `ACCENT` there and the whole app (including the artwork) follows
- `src/App.jsx` – the app (from the original prototype)
- `src/data/` – bundled sample Bible text, Tamil sample, book names and daily line art
- `public/icons/` – PWA icons generated from the Read logo
- `vite.config.js` – PWA manifest + service worker (precaches everything for offline use)
- `vercel.json` – Vercel config: security headers (CSP etc.), long caching for hashed assets, no-cache for the service worker and manifest

## Deploy on Vercel

1. Go to https://vercel.com/new and import this GitHub repository.
2. Framework preset: **Vite** (auto-detected). Build command `npm run build`, output directory `dist`.
3. Click **Deploy**. Every push to the main branch redeploys automatically.

## Install on a phone

- **iPhone (Safari):** open the site → Share → **Add to Home Screen**.
- **Android (Chrome):** menu → **Install app**.

## Bible data

The app downloads two small files, `public/data/en.bin` (0.9 MB) and `public/data/ta.bin` (1.2 MB), once, and keeps them
for offline use (2.3 MB for the whole app). They are loaded in the background after the app opens (English first). Each
language stays in memory as a single text plus a table of verse positions; a chapter is cut out when it is shown and
search scans the text directly, so nothing is expanded into per-verse objects.

How they are made (only needed when the Bible text changes):

1. `pip install pymupdf && python3 scripts/build-esv.py "ESV Bible.pdf"` writes `data-src/en.json` (verse text only:
   headings, footnotes, psalm titles removed; repeated paragraph-opening quotes, line-break hyphens and apostrophes tidied).
   It needs `data-src/ta.json` to exist.
2. `node scripts/build-tamil.mjs path/to/tamil_bible_new.sqlite` (Node 22+) writes `data-src/ta.json`.
3. `pip install zopfli && python3 scripts/pack-bible.py` writes the two `.bin` files and verifies a full round trip.
   English: words numbered by frequency. Tamil: one byte per character (61 distinct). Both gzipped with zopfli.

`src/data/pack.js` decodes them (native `DecompressionStream`, with `fflate` as the fallback for older browsers).
