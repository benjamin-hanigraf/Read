import { useSyncExternalStore } from "react";
import { BOOKS } from "./books.js";
import { gunzip, unpackEn, unpackTa } from "./pack.js";

// The app opens straight away; the Bible loads in the background (English first) and subscribers are notified.
// Each language is kept as ONE text plus a table of where every verse starts (see pack.js), so nothing is split into
// per-verse objects up front: a chapter is cut out of the text when it is shown, and search scans the text directly.
const D = { en: null, ta: null };  // { text, vs, cs } per language once loaded

const CHAPTERS = 1189;
const state = { version: 0, error: false };
const subs = new Set();
const emit = () => { state.version++; subs.forEach(f => f()); };
export const useBible = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => state.version);
export const bibleReady = lang => (lang === "both" ? !!(D.en && D.ta) : !!D[lang]);
export const bibleFailed = () => state.error;

// chapter number (0-based, canonical order) <-> "Genesis 1"
const cIndex = new Map(), cBook = [], cNum = [];
for (const [b, n] of BOOKS) for (let i = 1; i <= n; i++) { cIndex.set(`${b} ${i}`, cBook.length); cBook.push(b); cNum.push(i); }

const verseText = (d, c, v) => {  // verse v (1-based) of chapter c, or "" if there is none
  const i = d.cs[c] + v - 1;
  return i < d.cs[c + 1] ? d.text.slice(d.vs[i], d.vs[i + 1] - 1) : "";
};
const side = (d, c) => {  // { verse number: text } for one chapter, left out when the verse is empty
  const o = {};
  for (let i = d.cs[c], e = d.cs[c + 1]; i < e; i++) { const s = d.text.slice(d.vs[i], d.vs[i + 1] - 1); if (s) o[i - d.cs[c] + 1] = s; }
  return o;
};

// CH["Genesis 1"] = { en: {1: "verse", ...}, ta: {...} }, built when asked for; the most recent chapters are kept.
const recent = new Map();
const chapter = k => {
  const c = cIndex.get(k); if (c === undefined) return undefined;
  let o = recent.get(k);
  if (o) { recent.delete(k); recent.set(k, o); return o; }
  o = { _en: null, _ta: null, get en() { return this._en || (D.en ? (this._en = side(D.en, c)) : {}); }, get ta() { return this._ta || (D.ta ? (this._ta = side(D.ta, c)) : {}); } };
  recent.set(k, o); if (recent.size > 40) recent.delete(recent.keys().next().value);
  return o;
};
export const CH = new Proxy({}, { get: (_, k) => (typeof k === "string" ? chapter(k) : undefined) });

// ---- search ----
const norm = s => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"');  // same length as the original
let lower = null;  // lowercase English text, made the first time you search
const upper = (a, x, n) => { let lo = 0, hi = n; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] <= x) lo = m + 1; else hi = m; } return lo - 1; };  // last index with a[i] <= x
const hitsIn = (d, text, q) => {  // verse keys (chapter * 1024 + verse) of every verse containing q, in order
  const out = [], nv = d.vs.length - 1;
  for (let p = text.indexOf(q); p !== -1;) {
    const i = upper(d.vs, p, nv), c = upper(d.cs, i, d.cs.length - 1);
    out.push(c * 1024 + (i - d.cs[c] + 1));
    p = text.indexOf(q, d.vs[i + 1]);  // carry on from the next verse: a verse counts once
  }
  return out;
};
// { hits: first `limit` verses [{ b, n, v, en, ta }], total } for the verses containing `query` in the language(s) shown
export function searchBible(query, lang, limit = 60) {
  const lists = [];
  if (lang !== "ta" && D.en) { lower ||= norm(D.en.text); lists.push(hitsIn(D.en, lower, norm(query))); }
  if (lang !== "en" && D.ta) lists.push(hitsIn(D.ta, D.ta.text, query));
  let keys = lists[0] || [];
  if (lists.length === 2) {  // both languages: merge, each verse once
    const [a, b] = lists; keys = []; let i = 0, j = 0;
    while (i < a.length || j < b.length) { const x = i < a.length ? a[i] : Infinity, y = j < b.length ? b[j] : Infinity; if (x <= y) { keys.push(x); i++; if (x === y) j++; } else { keys.push(y); j++; } }
  }
  const hits = keys.slice(0, limit).map(k => {
    const c = k >> 10, v = k & 1023;
    return { b: cBook[c], n: cNum[c], v, en: D.en ? verseText(D.en, c, v) : "", ta: D.ta ? verseText(D.ta, c, v) : "" };
  });
  return { hits, total: keys.length };
}

// ---- loading ----
const get = lang => fetch(`/data/${lang}.bin`)
  .then(r => { if (!r.ok) throw new Error(`Could not load ${lang}`); return r.arrayBuffer(); })
  .then(gunzip)
  .then(u8 => {
    const d = lang === "en" ? unpackEn(u8) : unpackTa(u8);
    // a truncated or corrupted download must fail loudly instead of showing a Bible with holes
    if (d.cs.length - 1 !== CHAPTERS) throw new Error(`${lang} Bible has ${d.cs.length - 1} chapters, expected ${CHAPTERS}`);
    D[lang] = d; if (lang === "en") lower = null;
    emit();
  });

const savedLang = () => { try { return JSON.parse(localStorage.getItem("read:lang")); } catch { return null; } };
let running = null;
export function loadBible() {
  if (running) return running;
  state.error = false;
  const order = savedLang() === "ta" ? ["ta", "en"] : ["en", "ta"];
  running = order.reduce((p, l) => p.then(() => D[l] || get(l)), Promise.resolve())
    .catch(e => { console.error(e); state.error = true; emit(); })
    .finally(() => { running = null; });
  return running;
}
if (typeof window !== "undefined") window.addEventListener("online", () => { if (state.error) loadBible(); });
