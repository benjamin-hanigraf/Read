import { useSyncExternalStore } from "react";

// CH["Genesis 1"] = { en: {1: "verse", ...}, ta: {...} }, VERSES = flat list for search.
// The app opens straight away; the Bible loads in the background (English first) and subscribers are notified.
export const CH = {};
export const VERSES = [];

// data/{en,ta}.json: { "Genesis": [ ["verse 1", "verse 2", ...], ...chapters ], ... }
// Tamil is stored with its letters shifted from U+0B80-0BFF to U+0100-017F (smaller file). It stays shifted in memory
// and is shifted back one chapter at a time (taOut), so start-up does not have to convert 8 MB of text.
export const taOut = s => s.replace(/[Ā-ſ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x0a80));
export const taIn = s => s.replace(/[஀-௿]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x0a80));

const CHAPTERS = 1189;
const raw = { en: {}, ta: {} };            // "Genesis 1" -> [verse texts]
const state = { version: 0, error: false, ready: { en: false, ta: false } };
const subs = new Set();
const emit = () => { state.version++; subs.forEach(f => f()); };
export const useBible = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => state.version);
export const bibleReady = lang => (lang === "both" ? state.ready.en && state.ready.ta : state.ready[lang]);
export const bibleFailed = () => state.error;

const chapter = k => CH[k] || (CH[k] = Object.defineProperty({ en: {} }, "ta", {
  enumerable: true, configurable: true,
  get() {
    const o = {};
    if (!raw.ta[k]) return o;  // not loaded yet: do not cache the empty answer
    raw.ta[k].forEach((s, i) => { if (s) o[i + 1] = taOut(s); });
    Object.defineProperty(this, "ta", { value: o, enumerable: true });
    return o;
  },
}));

const rebuild = () => {
  VERSES.length = 0;  // VERSES[].ta stays shifted (see taIn / taOut); en is lowercased once as lo for search, with curly quotes made straight
  for (const k in CH) {
    const b = k.replace(/ \d+$/, ""), n = +k.slice(b.length + 1), e = raw.en[k] || [], t = raw.ta[k] || [];
    for (let j = 0, m = Math.max(e.length, t.length); j < m; j++) {
      const en = e[j] || "", ta = t[j] || "";
      if (en || ta) VERSES.push({ b, n, v: j + 1, en, ta, lo: en.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"') });
    }
  }
};

const get = lang => fetch(`/data/${lang}.json`)
  .then(r => { if (!r.ok) throw new Error(`Could not load ${lang}`); return r.json(); })
  .then(data => {
    // a truncated or corrupted download must fail loudly instead of showing a Bible with holes
    const n = Object.values(data).reduce((t, c) => t + c.length, 0);
    if (n !== CHAPTERS) throw new Error(`${lang} Bible has ${n} chapters, expected ${CHAPTERS}`);
    for (const [book, chapters] of Object.entries(data)) chapters.forEach((verses, i) => {
      const k = `${book} ${i + 1}`, d = chapter(k);
      raw[lang][k] = verses;
      if (lang === "en") verses.forEach((s, j) => { if (s) d.en[j + 1] = s; });
    });
    rebuild(); state.ready[lang] = true; emit();
  });

const savedLang = () => { try { return JSON.parse(localStorage.getItem("read:lang")); } catch { return null; } };
let running = null;
export function loadBible() {
  if (running) return running;
  state.error = false;
  const order = savedLang() === "ta" ? ["ta", "en"] : ["en", "ta"];
  running = order.reduce((p, l) => p.then(() => state.ready[l] || get(l)), Promise.resolve())
    .catch(e => { console.error(e); state.error = true; emit(); })
    .finally(() => { running = null; });
  return running;
}
if (typeof window !== "undefined") window.addEventListener("online", () => { if (state.error) loadBible(); });
