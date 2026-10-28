#!/usr/bin/env python3
"""Usage: python3 scripts/build-esv.py "ESV Bible.pdf" [out.json]

Extracts the verse text from the ESV PDF (needs `pip install pymupdf`) and writes
public/data/en.json as { "Genesis": [ ["verse 1", "verse 2", ...], ...chapters ], ... }.
Dropped: front matter, section headings, psalm titles, footnotes and footnote markers.
"""
import json, re, sys
import pymupdf

BOOKS = [("Genesis", 50, "GENESIS"), ("Exodus", 40, "EXODUS"), ("Leviticus", 27, "LEVITICUS"), ("Numbers", 36, "NUMBERS"), ("Deuteronomy", 34, "DEUTERONOMY"), ("Joshua", 24, "JOSHUA"), ("Judges", 21, "JUDGES"), ("Ruth", 4, "RUTH"), ("1 Samuel", 31, "1 SAMUEL"), ("2 Samuel", 24, "2 SAMUEL"), ("1 Kings", 22, "1 KINGS"), ("2 Kings", 25, "2 KINGS"), ("1 Chronicles", 29, "1 CHRONICLES"), ("2 Chronicles", 36, "2 CHRONICLES"), ("Ezra", 10, "EZRA"), ("Nehemiah", 13, "NEHEMIAH"), ("Esther", 10, "ESTHER"), ("Job", 42, "JOB"), ("Psalm", 150, "PSALMS"), ("Proverbs", 31, "PROVERBS"), ("Ecclesiastes", 12, "ECCLESIASTES"), ("Song of Solomon", 8, "SONG OF SOLOMON"), ("Isaiah", 66, "ISAIAH"), ("Jeremiah", 52, "JEREMIAH"), ("Lamentations", 5, "LAMENTATIONS"), ("Ezekiel", 48, "EZEKIEL"), ("Daniel", 12, "DANIEL"), ("Hosea", 14, "HOSEA"), ("Joel", 3, "JOEL"), ("Amos", 9, "AMOS"), ("Obadiah", 1, "OBADIAH"), ("Jonah", 4, "JONAH"), ("Micah", 7, "MICAH"), ("Nahum", 3, "NAHUM"), ("Habakkuk", 3, "HABAKKUK"), ("Zephaniah", 3, "ZEPHANIAH"), ("Haggai", 2, "HAGGAI"), ("Zechariah", 14, "ZECHARIAH"), ("Malachi", 4, "MALACHI"), ("Matthew", 28, "MATTHEW"), ("Mark", 16, "MARK"), ("Luke", 24, "LUKE"), ("John", 21, "JOHN"), ("Acts", 28, "ACTS"), ("Romans", 16, "ROMANS"), ("1 Corinthians", 16, "1 CORINTHIANS"), ("2 Corinthians", 13, "2 CORINTHIANS"), ("Galatians", 6, "GALATIANS"), ("Ephesians", 6, "EPHESIANS"), ("Philippians", 4, "PHILIPPIANS"), ("Colossians", 4, "COLOSSIANS"), ("1 Thessalonians", 5, "1 THESSALONIANS"), ("2 Thessalonians", 3, "2 THESSALONIANS"), ("1 Timothy", 6, "1 TIMOTHY"), ("2 Timothy", 4, "2 TIMOTHY"), ("Titus", 3, "TITUS"), ("Philemon", 1, "PHILEMON"), ("Hebrews", 13, "HEBREWS"), ("James", 5, "JAMES"), ("1 Peter", 5, "1 PETER"), ("2 Peter", 3, "2 PETER"), ("1 John", 5, "1 JOHN"), ("2 John", 1, "2 JOHN"), ("3 John", 1, "3 JOHN"), ("Jude", 1, "JUDE"), ("Revelation", 22, "REVELATION")]

pdf = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else "public/data/en.json"
doc = pymupdf.open(pdf)
first = lambda i: next((l.strip() for l in doc[i].get_text().split("\n") if l.strip()), "")
foot = [i for i in range(len(doc)) if first(i) == "Footnotes"]

starts, at = [], 20  # pages before 20 are the cover, contents, copyright and preface
for _, _, cap in BOOKS:
    at = next(i for i in range(at, len(doc)) if first(i) == cap)
    starts.append(at); at += 1

# The PDF tells the pieces apart by font: body text is regular 10.8pt, verse numbers are bold 9pt, chapter numbers are
# bold 14.4pt; headings, psalm titles, footnote markers and the book/chapter lists use other fonts, so they are skipped.
result = {}
for k, (name, nch, cap) in enumerate(BOOKS):
    end = next(f for f in foot if f > starts[k])  # the text stops where this book's footnotes begin
    chapters = [{} for _ in range(nch)]
    c = v = 1
    add = lambda t: chapters[c - 1].__setitem__(v, chapters[c - 1].get(v, "") + t)
    for pn in range(starts[k], end):
        for b in doc[pn].get_text("dict")["blocks"]:
            for line in b.get("lines", []):
                for sp in line["spans"]:
                    t, size, font = sp["text"], sp["size"], sp["font"]
                    if "Bold" in font and abs(size - 14.4) < 0.5 and t.strip().isdigit() and nch > 1:
                        c, v = int(t), 1
                    elif "Bold" in font and abs(size - 9.0) < 0.5 and t.strip().isdigit():
                        v = int(t)
                    elif "ArialRegular" in font and size > 10 and not re.fullmatch(r"\s*Chapter \d+\s*", t):
                        add(t)
                add(" ")
    chapters = [[re.sub(r"\s+", " ", d.get(i, "")).strip() for i in range(1, max(d, default=0) + 1)] for d in chapters]
    result[name] = chapters

json.dump(result, open(out, "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))
print("wrote", out, sum(len(ch) for chs in result.values() for ch in chs), "verses")
