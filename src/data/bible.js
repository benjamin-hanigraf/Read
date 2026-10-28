import { SAMPLE } from "./sample.js";

// CH[chapterKey] = { en: {verse: text}, ta: {verse: text} }, VERSES = flat list for search.
// Both are filled in place by loadBible() before the app renders.
export const CH = {};
export const VERSES = [];

const parseEN = tx => { const p = tx.split(/⟦(\d+)⟧/), o = {}; for (let i = 1; i < p.length; i += 2) o[+p[i]] = p[i + 1].trim(); return o; };

export async function loadBible() {
  const ta = await fetch("/data/ta.json").then(r => { if (!r.ok) throw new Error("Could not load Tamil Bible"); return r.json(); });
  Object.entries(ta).forEach(([k, o]) => { CH[k] = { en: {}, ta: {} }; Object.entries(o).forEach(([v, s]) => { CH[k].ta[+v] = s; }); });
  // English: bundled ESV sample chapters until the full text is added.
  Object.entries(SAMPLE).forEach(([k, tx]) => { CH[k] = CH[k] || { en: {}, ta: {} }; CH[k].en = parseEN(tx); });
  Object.entries(CH).forEach(([k, d]) => {
    const b = k.replace(/ \d+$/, ""), n = +k.split(" ").pop();
    [...new Set([...Object.keys(d.en), ...Object.keys(d.ta)])].map(Number).sort((a, c) => a - c)
      .forEach(v => VERSES.push({ b, n, v, en: d.en[v] || "", ta: d.ta[v] || "" }));
  });
}
