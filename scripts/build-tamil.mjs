// Usage: node scripts/build-tamil.mjs path/to/tamil_bible_new.sqlite
// Writes public/data/ta.json shaped { "Genesis 1": { "1": "verse text", ... }, ... } in canonical order.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";

const BOOKS = ["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalm","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi","Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"];

const db = new DatabaseSync(process.argv[2], { readOnly: true });
const rows = db.prepare("SELECT Book, Chapter, Verse, TextData FROM Bible ORDER BY Book, Chapter, Verse").all();
const out = {};
for (const { Book, Chapter, Verse, TextData } of rows) {
  const k = `${BOOKS[Book - 1]} ${Chapter}`;
  (out[k] ||= {})[Verse] = TextData.trim();
}
mkdirSync("public/data", { recursive: true });
writeFileSync("public/data/ta.json", JSON.stringify(out));
console.log(`${Object.keys(out).length} chapters, ${rows.length} verses`);
