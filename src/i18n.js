// Interface text. [English, Tamil]: the Tamil is used when the language button is set to அ; "A" and "Aஅ" keep English.
const UI = {
  app: ["Read", "வாசி"],
  startDate: ["Start date", "தொடக்க தேதி"],
  begin: ["Begin", "தொடங்கு"],
  today: ["Today", "இன்று"],
  bible: ["Bible", "வேதாகமம்"],
  ofBible: ["completed", "நிறைவுற்றது"],
  booksRead: ["books read", "வாசித்த நூல்கள்"],
  streak: ["day streak", "தொடர் நாட்கள்"],
  catchUp: ["Catch-up", "விடுபட்டவை"],
  rest: ["Rest", "ஓய்வு"],
  restDay: ["A day to rest. Open any unfinished day from the calendar.", "ஓய்வு நாள். விடுபட்ட நாளை நாள்காட்டியில் திறக்கவும்."],
  planDone: ["The plan is complete.", "திட்டம் முடிந்தது."],
  cont: ["Continue", "தொடர்க"],
  start: ["Start", "தொடங்கு"],
  nextPortion: ["Read next portion", "அடுத்த பகுதி"],
  next: ["Next", "அடுத்து"],
  done: ["Done", "முடிந்தது"],
  copied: ["Copied", "நகலெடுக்கப்பட்டது"],
  favOn: ["Added to favourites", "பிடித்தவையில் சேர்க்கப்பட்டது"],
  favOff: ["Removed from favourites", "பிடித்தவையிலிருந்து நீக்கப்பட்டது"],
  hlOn: ["Highlighted", "குறிக்கப்பட்டது"],
  hlOff: ["Highlight removed", "குறி நீக்கப்பட்டது"],
  favs: ["Favourites", "பிடித்தவை"],
  favHint: ["Swipe a verse to the right to save it here.", "சேமிக்க வசனத்தை வலப்புறம் தள்ளவும்."],
  search: ["Search, or go to John 3:16", "தேடு, அல்லது யோவான் 3:16"],
  goTo: ["Go to", "செல்:"],
  noResults: ["No results for", "முடிவில்லை:"],
  more: ["Show more", "மேலும்"],
  by: ["Created by Benjamin Hanigraf", "உருவாக்கியவர்: பென்ஜமின் ஹானிகிராஃப்"],
  sub: ["Tamil Bible", "தமிழ் வேதாகமம்"],
  loading: ["Loading…", "ஏற்றுகிறது…"],
  failed: ["Couldn't load the Bible. Check your connection.", "ஏற்ற முடியவில்லை. இணைப்பைச் சரிபார்க்கவும்."],
  placeholder: ["The full text for this chapter loads from your Bible files in the PWA build.", "முழு உரை PWA பதிப்பில் ஏற்றப்படும்."],
  aBack: ["Back", "பின்"],
  aLang: ["Language", "மொழி"],
  aRead: ["Mark as read", "படித்ததாகக் குறி"],
  aClear: ["Clear search", "தேடலை அழி"],
  aUnfav: ["Remove favourite", "பிடித்ததை நீக்கு"],
  aSmall: ["Smaller text", "சிறிய எழுத்து"],
  aLarge: ["Larger text", "பெரிய எழுத்து"],
};
export const t = (lang, k) => UI[k][lang === "ta" ? 1 : 0];

// Tamil calendar words (Intl's own are long: திங்கட்கிழமை)
const DAYS = ["ஞாயிறு", "திங்கள்", "செவ்வாய்", "புதன்", "வியாழன்", "வெள்ளி", "சனி"];
const MONTHS = ["ஜனவரி", "பிப்ரவரி", "மார்ச்", "ஏப்ரல்", "மே", "ஜூன்", "ஜூலை", "ஆகஸ்ட்", "செப்டம்பர்", "அக்டோபர்", "நவம்பர்", "டிசம்பர்"];
export const dayLetters = lang => (lang === "ta" ? ["ஞா", "தி", "செ", "பு", "வி", "வெ", "ச"] : "SMTWTFS".split(""));
export const weekdayName = (d, lang) => (lang === "ta" ? DAYS[d.getDay()] : d.toLocaleDateString("en-GB", { weekday: "long" }));
export const longDate = (d, lang) => (lang === "ta" ? `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}` : (() => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).formatToParts(d).map(x => [x.type, x.value])); return `${p.weekday}, ${p.day} ${p.month}`; })());
export const monthYear = (y, m, lang) => (lang === "ta" ? `${MONTHS[m]} ${y}` : new Date(y, m, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" }));
export const nResults = (n, lang) => (lang === "ta" ? `${n} முடிவு${n === 1 ? "" : "கள்"}` : n === 1 ? "1 result" : `${n} results`);
export const showingFirst = (n, lang) => (lang === "ta" ? ` · முதல் ${n}` : ` · showing first ${n}`);
export const nCopied = (n, lang) => (lang === "ta" ? `${n} வசனங்கள் நகலெடுக்கப்பட்டன` : `Copied ${n} verses`);
