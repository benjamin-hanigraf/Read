// Decoders for the packed Bible files (public/data/en.bin, ta.bin). Pure functions, no DOM, so they are also used by the
// Node tests. See scripts/pack-bible.py for the encoder and the exact layout.
//
// Both files are gzip. Inside, all verses of a language are one text: verses end with "\n", chapters with "\f", chapters in
// canonical order. Each decoder returns { text, vs, cs }: the text, the start offset of every verse (vs, plus an end marker)
// and the index of the first verse of every chapter (cs, plus an end marker). Verse i is text.slice(vs[i], vs[i + 1] - 1).

export async function gunzip(buf) {
  if (typeof DecompressionStream === "function") {
    const s = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  const { gunzipSync } = await import("fflate");  // older browsers
  return gunzipSync(new Uint8Array(buf));
}

// English: words are numbered by how often they occur (most frequent first, so most are one byte) and the text is the
// list of those numbers. Layout: u32 text size in bytes, u32 vocabulary byte length, vocabulary (UTF-8, words separated by
// \x01), then the numbers as variable-length integers (7 bits per byte, low bits first, high bit = another byte follows).
export function unpackEn(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), outLen = dv.getUint32(0, true), vlen = dv.getUint32(4, true);
  const v0 = 8, v1 = 8 + vlen, ws = [], we = [];  // where each word starts and ends inside the vocabulary bytes
  for (let i = v0, s = v0; i <= v1; i++) if (i === v1 || u8[i] === 1) { ws.push(s); we.push(i); s = i + 1; }
  const out = new Uint8Array(outLen);
  let o = 0;
  for (let p = v1, n = u8.length; p < n;) {
    let id = u8[p++];
    if (id & 128) { id &= 127; let sh = 7, b; do { b = u8[p++]; id |= (b & 127) << sh; sh += 7; } while (b & 128); }
    for (let k = ws[id], e = we[id]; k < e; k++) out[o++] = u8[k];
  }
  return indexOf(new TextDecoder().decode(out));
}

// finds where every verse and chapter starts in a text (verses end with \n, chapters with \f)
function indexOf(text) {
  const vs = new Uint32Array(40000), cs = new Uint32Array(1300);
  let nv = 1, nc = 1;
  for (let i = 0, n = text.length; i < n; i++) {
    const c = text.charCodeAt(i);
    if (c === 10) vs[nv++] = i + 1; else if (c === 12) { vs[nv++] = i + 1; cs[nc++] = nv - 1; }
  }
  vs[nv] = text.length + 1; cs[nc] = nv;
  return { text, vs: vs.subarray(0, nv + 1), cs: cs.subarray(0, nc + 1) };
}

// Tamil: 61 distinct characters, so each is one byte. Layout: u16 alphabet size, the alphabet (one u16 per character),
// then one byte per character of the text.
export function unpackTa(u8) {
  const n = u8[0] | (u8[1] << 8), code = new Uint16Array(n);
  for (let i = 0; i < n; i++) code[i] = u8[2 + 2 * i] | (u8[3 + 2 * i] << 8);
  const base = 2 + 2 * n, chars = new Uint16Array(u8.length - base);
  for (let j = 0; j < chars.length; j++) chars[j] = code[u8[base + j]];
  return indexOf(new TextDecoder("utf-16le").decode(chars));
}
