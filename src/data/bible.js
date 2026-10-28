// CH["Genesis 1"] = { en: {1: "verse", ...}, ta: {...} }, VERSES = flat list for search.
// Both are filled in place by loadBible() before the app renders.
export const CH = {};
export const VERSES = [];

// data/{en,ta}.json: { "Genesis": [ ["verse 1", "verse 2", ...], ...chapters ], ... }
// Tamil is stored with its letters shifted from U+0B80-0BFF to U+0100-017F (smaller file); shift them back.
const fetchBible = (lang) => fetch(`/data/${lang}.json`).then(r => { if (!r.ok) throw new Error(`Could not load ${lang}`); return r.text(); })
  .then(t => JSON.parse(lang === "ta" ? t.replace(/[Ā-ſ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x0a80)) : t));

const CHAPTERS = 1189;

export async function loadBible() {
  const [en, ta] = await Promise.all([fetchBible("en"), fetchBible("ta")]);
  const data = { en, ta };
  // a truncated or corrupted download must fail loudly instead of showing a Bible with holes
  for (const lang of ["en", "ta"]) {
    const n = Object.values(data[lang]).reduce((t, c) => t + c.length, 0);
    if (n !== CHAPTERS) throw new Error(`${lang} Bible has ${n} chapters, expected ${CHAPTERS}`);
  }
  for (const lang of ["ta", "en"]) {
    for (const [book, chapters] of Object.entries(data[lang])) {
      chapters.forEach((verses, i) => {
        const d = (CH[`${book} ${i + 1}`] ||= { en: {}, ta: {} });
        verses.forEach((s, j) => { if (s) d[lang][j + 1] = s; });
      });
    }
  }
  Object.entries(CH).forEach(([k, d]) => {
    const b = k.replace(/ \d+$/, ""), n = +k.split(" ").pop();
    [...new Set([...Object.keys(d.en), ...Object.keys(d.ta)])].map(Number).sort((a, c) => a - c)
      .forEach(v => VERSES.push({ b, n, v, en: d.en[v] || "", ta: d.ta[v] || "", lo: (d.en[v] || "").toLowerCase() }));  // lo: lowercase English, computed once for search
  });
}
