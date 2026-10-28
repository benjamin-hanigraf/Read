#!/usr/bin/env python3
"""Usage: python3 scripts/pack-bible.py [data-src/en.json data-src/ta.json]

Packs the two source files (written by build-esv.py and build-tamil.mjs) into the small files the app downloads and keeps
offline: public/data/en.bin and public/data/ta.bin. Layouts are described in src/data/pack.js, which decodes them.
Needs `pip install zopfli` for the best compression (falls back to plain gzip -9). Verifies a full round trip.
"""
import collections, gzip, json, os, re, struct, sys

try:
    import zopfli.gzip as zg
    pack_gz = lambda b: zg.compress(b, numiterations=25)
except ImportError:
    print("zopfli not installed: using gzip -9 (a few percent larger)")
    pack_gz = lambda b: gzip.compress(b, 9, mtime=0)

src_en, src_ta = sys.argv[1:3] if len(sys.argv) > 2 else ("data-src/en.json", "data-src/ta.json")
os.makedirs("public/data", exist_ok=True)

def text_of(path):
    d = json.load(open(path, encoding="utf8"))
    return "\f".join("\n".join(ch) for chs in d.values() for ch in chs)

def varint(i, out):
    while i >= 0x80: out.append(0x80 | (i & 0x7F)); i >>= 7
    out.append(i)

def pack_en(text):
    toks = re.findall(r"[^\W\d_]+|\d+|\s|.", text, re.S)
    assert "".join(toks) == text
    cnt = collections.Counter(toks)
    vocab = sorted(cnt, key=lambda w: (-cnt[w], w))
    idx = {w: i for i, w in enumerate(vocab)}
    vb = "\x01".join(vocab).encode("utf8")
    ids = bytearray()
    for t in toks: varint(idx[t], ids)
    return struct.pack("<II", len(text.encode("utf8")), len(vb)) + vb + bytes(ids)

def unpack_en(b):  # same algorithm as src/data/pack.js, used to verify
    outlen, vlen = struct.unpack_from("<II", b)
    vocab = b[8:8 + vlen].decode("utf8").split("\x01"); out = []; p = 8 + vlen
    while p < len(b):
        i = 0; sh = 0
        while True:
            c = b[p]; p += 1; i |= (c & 0x7F) << sh; sh += 7
            if not c & 0x80: break
        out.append(vocab[i])
    t = "".join(out); assert len(t.encode("utf8")) == outlen
    return t

def pack_ta(text):
    alpha = sorted(set(text)); assert len(alpha) < 256 and all(ord(c) < 0x10000 for c in alpha)
    code = {c: i for i, c in enumerate(alpha)}
    return struct.pack("<H", len(alpha)) + b"".join(struct.pack("<H", ord(c)) for c in alpha) + bytes(code[c] for c in text)

def unpack_ta(b):
    n = struct.unpack_from("<H", b)[0]; alpha = [chr(struct.unpack_from("<H", b, 2 + 2 * i)[0]) for i in range(n)]
    return "".join(alpha[x] for x in b[2 + 2 * n:])

for name, path, pk, upk in (("en", src_en, pack_en, unpack_en), ("ta", src_ta, pack_ta, unpack_ta)):
    text = text_of(path); raw = pk(text)
    assert upk(raw) == text, f"{name}: round trip failed"
    gz = pack_gz(raw); assert gzip.decompress(gz) == raw
    open(f"public/data/{name}.bin", "wb").write(gz)
    print(f"{name}: {len(text):,} chars -> packed {len(raw):,} bytes -> gzip {len(gz):,} bytes")
