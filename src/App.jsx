import { useState, useEffect, useLayoutEffect, useRef, useMemo, useReducer } from "react";

import { ARTS } from "./data/arts.js";
import { TA_NAMES } from "./data/names.js";
import { ACCENT, WHITE, BLACK, GREY_DARK, GREY_LIGHT, SELECT, HIGHLIGHT } from "./theme.js";
import { OT, WIS, NT, BOOKS } from "./data/books.js";
import { CH, searchBible, useBible, bibleReady, bibleFailed } from "./data/bible.js";

const flat = a => a.flatMap(([b, n]) => Array.from({ length: n }, (_, i) => [b, i + 1]));
const TR = [["Old Testament", flat(OT)], ["Psalms & Proverbs", flat(WIS)], ["New Testament", flat(NT)]];
const R = 312; // reading days: 6 per week, every 7th day is catch-up
const TOTAL = 1189;
const ALL = flat(BOOKS);
const nm = (b, lang) => (lang === "ta" ? TA_NAMES[BOOKS.findIndex(([x]) => x === b)] : b);
const disp = (b, lang) => (lang === "ta" ? nm(b, "ta") : b === "Psalm" ? "Psalms" : b);
const label = (c, lang) => { if (!c.length) return "Rest"; const [b1, n1] = c[0], [b2, n2] = c[c.length - 1]; const f = b => nm(b, lang); return b1 === b2 ? (n1 === n2 ? `${f(b1)} ${n1}` : `${f(b1)} ${n1}–${n2}`) : `${f(b1)} ${n1} – ${f(b2)} ${n2}`; };
const LANGS = ["en", "ta", "both"];
const LANG_LABEL = { en: "A", ta: "அ", both: "Aஅ" };
const taFont = "'Noto Serif Tamil', 'Noto Sans Tamil', 'Tamil MN', 'Tamil Sangam MN', 'Nirmala UI', 'Latha', serif";
const pk = k => { const m = k.match(/^(.*) (\d+):(\d+)$/); return { b: m[1], n: +m[2], v: +m[3] }; };
const CSS = "*{-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;scrollbar-width:none;-ms-overflow-style:none}*::-webkit-scrollbar{display:none;width:0;height:0}input,textarea{-webkit-user-select:text;user-select:text}input::placeholder{color:"+BLACK+";opacity:1}html,body{scrollbar-width:none}@keyframes wFade{from{opacity:0}to{opacity:1}}@keyframes wInR{from{transform:translateX(56px);opacity:0}to{transform:none;opacity:1}}@keyframes wInL{from{transform:translateX(-56px);opacity:0}to{transform:none;opacity:1}}";
const sv = (c, f) => <svg width="22" height="22" viewBox="0 0 24 24" fill={f ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{c}</svg>;
const Ico = {
  heart: f => sv(<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z" />, f),
  pen: f => sv(<><path d="M4 20h7" /><path d="M14.5 4.5l5 5L10 19H5v-5z" /></>, f),
  heartS: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z" /></svg>,
};
const useSwipeBack = (ref, cb, active) => {
  const f = useRef(cb); f.current = cb;
  useEffect(() => {
    if (!active) return;
    let s = null;
    const node = () => ref.current;
    const ts = e => { const q = e.touches[0]; s = q.clientX < 24 ? { x: q.clientX, y: q.clientY, on: false, dx: 0 } : null; };
    const tm = e => {
      if (!s || !node()) return;
      const q = e.touches[0], dx = q.clientX - s.x, dy = q.clientY - s.y;
      if (!s.on) { if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { s = null; return; } if (dx > 8) s.on = true; else return; }
      if (e.cancelable) e.preventDefault();
      s.dx = dx; const n = node(); n.style.transition = "none"; n.style.transform = `translateX(${Math.max(0, dx)}px)`;
    };
    const te = () => {
      if (!s) return; const n = node(), on = s.on, dx = s.dx; s = null; if (!on || !n) return;
      const w = window.innerWidth;
      if (dx > w * 0.3) { n.style.transition = "transform .22s ease-out"; n.style.transform = `translateX(${w}px)`; setTimeout(() => { f.current(); setTimeout(() => { n.style.transition = "none"; n.style.transform = ""; }, 60); }, 210); }
      else { n.style.transition = "transform .2s ease-out"; n.style.transform = ""; }
    };
    window.addEventListener("touchstart", ts, { passive: true });
    window.addEventListener("touchmove", tm, { passive: false });
    window.addEventListener("touchend", te);
    window.addEventListener("touchcancel", te);
    return () => { window.removeEventListener("touchstart", ts); window.removeEventListener("touchmove", tm); window.removeEventListener("touchend", te); window.removeEventListener("touchcancel", te); };
  }, [active]);
};
const copyText = async s => { try { await navigator.clipboard.writeText(s); } catch { try { const a = document.createElement("textarea"); a.value = s; a.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(a); a.select(); document.execCommand("copy"); a.remove(); } catch {} } };
const norm = s => s.toLowerCase().replace(/\s+/g, "");

const chaptersFor = (t, r) => { const N = TR[t][1].length; return TR[t][1].slice(Math.round(r * N / R), Math.round((r + 1) * N / R)); };
const plan = { dow: 1 };
const isCatchUp = n => (plan.dow + n) % 7 === 0;
const readIdx = n => { const s0 = (7 - plan.dow) % 7; return n - (n > s0 ? Math.floor((n - 1 - s0) / 7) + 1 : 0); };
const planLens = {};
const planLen = () => planLens[plan.dow] ??= (() => { let n = 0; while (isCatchUp(n) || readIdx(n) < R) n++; return n; })();
const dayItems = n => isCatchUp(n) || readIdx(n) >= R ? [] : [0, 1, 2].map(t => ({ key: `${n}:${t}`, n, t, ch: chaptersFor(t, readIdx(n)) })).filter(i => i.ch.length);

const C = { bg: BLACK, text: WHITE, card: GREY_DARK, grey: GREY_LIGHT, accent: ACCENT, select: SELECT, hl: HIGHLIGHT };  // the seven colours, see theme.js
const RAD = 14;
const cl = (min, v, max) => `clamp(${min}px, ${v}dvh, ${max}px)`;
const ROWH = cl(56, 7.4, 66);
const ARTH = cl(88, 16, 150);
const NAV = "calc(61px + env(safe-area-inset-bottom, 0px))";  // height of the bottom bar
const NAVPAD = "calc(61px + env(safe-area-inset-bottom, 0px) + 24px)";  // bottom padding that keeps content clear of it
const TOP = "env(safe-area-inset-top, 0px)";
const backBtn = { display: "flex", alignItems: "center", background: "none", border: "none", color: C.accent, fontSize: 22, padding: "12px 16px", cursor: "pointer" };
const sans = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif";
const serif = "ui-serif, 'New York', Georgia, serif";
const ICONS = {
  today: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8 12.5l3 3 5-6" /></svg>,
  bible: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" /><path d="M5 17a3 3 0 0 1 3-3h10" /></svg>,
};
const xh = px => (0.52 * px) / 22;
const Chev = ({ d = "right", h = 0.7 }) => (
  <svg viewBox="0 0 11 20" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ height: `${h}em`, width: `${h * 0.55}em`, flexShrink: 0, display: "block", overflow: "visible" }}>
    <path d={d === "left" ? "M9 2L2 10l7 8" : "M2 2l7 8-7 8"} />
  </svg>
);
// On-device storage. Works in the installed PWA; the Claude preview blocks it, so it silently falls back to memory.
const store = {
  get(k, d, ok = () => true) { try { const v = localStorage.getItem("read:" + k); if (v == null) return d; const j = JSON.parse(v); return ok(j) ? j : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("read:" + k, JSON.stringify(v)); } catch {} },
};
const isObj = v => !!v && typeof v === "object" && !Array.isArray(v);
const okKeys = (v, re) => isObj(v) && Object.keys(v).every(k => re.test(k));
const okStart = v => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v + "T00:00"));
const okDone = v => okKeys(v, /^\d+:[0-2]$/);
const okSize = v => typeof v === "number" && v >= 10 && v <= 28;
const okLang = v => LANGS.includes(v);
const okFavs = v => Array.isArray(v) && v.every(k => typeof k === "string" && /^.+ \d+:\d+$/.test(k));
const okHls = v => okKeys(v, /^.+ \d+:\d+$/);
const longDate = d => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).formatToParts(d).map(x => [x.type, x.value])); return `${p.weekday}, ${p.day} ${p.month}`; };
const iso = d => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4); return z.toISOString().slice(0, 10); };
const dayDiff = (a, b) => Math.round((new Date(a + "T00:00") - new Date(b + "T00:00")) / 864e5);
const addDays = (s, k) => { const d = new Date(s + "T00:00"); d.setDate(d.getDate() + k); return d; };

const Pill = ({ children, onClick, disabled, ghost }) => (
  <button onClick={onClick} disabled={disabled} style={{ width: "100%", padding: `${cl(14, 1.9, 17)} 0`, borderRadius: RAD, border: "none", fontSize: 16, fontWeight: 600, fontFamily: sans, cursor: disabled ? "default" : "pointer", background: ghost ? C.card : disabled ? C.card : C.accent, color: ghost ? C.text : C.text }}>{children}</button>
);

const Check = ({ on, onClick }) => (
  <button onClick={e => { e.stopPropagation(); onClick(); }} aria-label="Mark as read" aria-pressed={on} style={{ background: "none", border: "none", padding: 11, margin: -11, cursor: "pointer", flexShrink: 0, display: "flex" }}>
    <span style={{ width: 18, height: 18, borderRadius: 9, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", border: on ? "none" : `1.5px solid ${C.bg}`, background: on ? C.accent : "transparent", color: C.text, fontSize: 11, fontWeight: 700, transition: "background .2s" }}>{on ? "✓" : ""}</span>
  </button>
);

const DayRing = ({ frac, size, sw = 3, onClick, style, children }) => {
  const r = (size - sw) / 2, c = 2 * Math.PI * r;
  return (
    <div onClick={onClick} style={{ position: "relative", width: size, height: size, ...style }}>
      <svg width={size} height={size} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        {frac > 0 && <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.accent} strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${c * frac} ${c}`} style={{ transition: "stroke-dasharray .4s ease" }} />}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>
    </div>
  );
};

function Art({ i, onTap }) {
  const a = ARTS[i];
  return (
    <div onClick={onTap} style={{ flex: "0 0 auto", height: ARTH, position: "relative" }} aria-hidden="true">
      <svg key={i} viewBox="0 0 300 200" preserveAspectRatio="xMidYMid meet" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", animation: "wFade .4s ease" }}>
        {a.els.map(([d, o], k) => <path key={k} d={d} fill="none" stroke={o >= 0.75 ? C.accent : o >= 0.4 ? C.select : C.hl} strokeWidth="1.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />)}  {/* the dimmer strokes use the two darker accent shades */}
      </svg>
    </div>
  );
}

function Ring({ v }) {
  const r = 22, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 56 56" style={{ width: cl(36, 5, 44), height: cl(36, 5, 44), flexShrink: 0 }}>
      <circle cx="28" cy="28" r={r} fill="none" stroke={C.card} strokeWidth="5" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={C.accent} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform="rotate(-90 28 28)" style={{ transition: "stroke-dashoffset .5s ease" }} />
    </svg>
  );
}

const LangLabel = ({ l }) => (
  <span style={{ display: "flex", alignItems: "baseline", gap: 1, lineHeight: 1, color: C.accent }}>
    {l !== "ta" && <span style={{ fontFamily: sans, fontSize: l === "both" ? 15 : 17, fontWeight: 600 }}>A</span>}
    {l !== "en" && <span style={{ fontFamily: taFont, fontSize: l === "both" ? 17 : 19, fontWeight: 600 }}>அ</span>}
  </span>
);
const LangBtn = ({ lang, setLang }) => (
  <button onClick={() => setLang(LANGS[(LANGS.indexOf(lang) + 1) % 3])} aria-label="Language" style={{ width: 52, height: 36, flexShrink: 0, background: C.card, border: "none", borderRadius: RAD, color: C.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><LangLabel l={lang} /></button>
);

function Reader({ item, size, setSize, close, go, advance, last, lang, setLang, favs, hls, toggleFav, toggleHl }) {
  const ver = useBible();
  const ref = useRef(null), sc = useRef(null);  // ref: the whole screen (slides away on swipe-back), sc: the scrolling text under the fixed top bar
  const browse = !item.key;
  const [cur, setCur] = useState(null);  // chapter ("Genesis 16") currently under the top bar
  // Bible reader: chapters are loaded around the one you opened, so it scrolls on continuously in both directions
  const idxOf = c => ALL.findIndex(([b, n]) => b === c[0] && n === c[1]);
  const first = useMemo(() => { const i = idxOf(item.ch[0]); return browse && i > 0 ? [ALL[i - 1], ...item.ch] : item.ch; }, [item]);
  const [ext, setExt] = useState({ item, list: first });
  const list = ext.item === item ? ext.list : first;
  const setList = l => setExt({ item, list: l });
  const anchor = useRef(null), pend = useRef(false), touched = useRef(false), placed = useRef(0);  // placed: where the opening position put the scroll
  const [menu, setMenu] = useState(null);
  const [toast, setToast] = useState("");
  const [jump, setJump] = useState(item.hl);
  const tt = useRef(0), act = useRef({}), mref = useRef(null);
  act.current = { favs, hls, toggleFav, toggleHl, lang };
  const setM = m => { mref.current = m; setMenu(m); };
  useSwipeBack(ref, close, true);
  const place = () => {
    const scr = sc.current; if (!scr) return;
    const hl = scr.querySelector("[data-hl]");
    if (hl) { hl.scrollIntoView({ block: "center" }); placed.current = scr.scrollTop; return; }
    const t = browse && idxOf(item.ch[0]) > 0 && scr.querySelector(`[data-vs="${item.ch[0][0]} ${item.ch[0][1]}"]`);
    if (t) scr.scrollTop += t.getBoundingClientRect().top - (ref.current.querySelector("[data-hdr]").getBoundingClientRect().bottom + 12);  // opened chapter just under the bar with its head tucked behind it; the previous chapter is above
    else scr.scrollTop = 0;
    placed.current = scr.scrollTop;
  };
  useEffect(() => { touched.current = false; setCur(null); setM(null); place(); }, [item]);
  useEffect(() => { if (!touched.current) place(); }, [ver]);  // text arrived after opening: settle again
  useEffect(() => { setJump(item.hl); const t0 = setTimeout(() => setJump(undefined), 1800); return () => clearTimeout(t0); }, [item]);
  // after chapters are added above or dropped from the top, keep the text you are reading where it was
  useLayoutEffect(() => {
    const a = anchor.current; anchor.current = null; pend.current = false;
    const scr = sc.current; if (!a || !scr) return;
    const el = scr.querySelector(`[data-key="${a.key}"]`);
    if (el) scr.scrollTop += el.getBoundingClientRect().top - a.top;
  }, [list]);
  useLayoutEffect(() => { if (!touched.current) place(); }, [list]);  // e.g. a short chapter: more text below lets it sit at the top
  useEffect(() => {
    const el = sc.current; if (!el) return;
    // Moving the scroll position while a fling is still running stops the fling on iOS and makes the text jump. So during a
    // fling chapters are only ever added BELOW you (nothing above moves, nothing needs correcting); adding chapters above,
    // and dropping old ones, wait until scrolling has stopped. (EDGE: you are about to hit the top, so add above at once.)
    const MAXHARD = 60, AHEAD = 4500, EDGE = 600;  // keep AHEAD px of text loaded above and below; chapters farther than 2 x AHEAD are dropped
    const keep = () => { const top = el.getBoundingClientRect().top, x = [...el.querySelectorAll("[data-sec]")].find(q => q.getBoundingClientRect().bottom > top + 1); anchor.current = x ? { key: x.getAttribute("data-key"), top: x.getBoundingClientRect().top } : null; };
    const grow = resting => {
      if (!browse || !bibleReady(lang) || pend.current) return;
      const first = idxOf(list[0]), last = idxOf(list[list.length - 1]), toTop = el.scrollTop, toEnd = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (toEnd < AHEAD && last < ALL.length - 1 && list.length < MAXHARD) { pend.current = true; setList([...list, ...ALL.slice(last + 1, last + 3)]); }
      else if (first > 0 && (toTop < EDGE || (resting && toTop < AHEAD))) { pend.current = true; keep(); setList([...ALL.slice(Math.max(0, first - 4), first), ...list]); }  // 4 at a time: fewer corrections
      else if (resting) {  // drop chapters that are far beyond the loaded margin (nothing near you moves)
        const er = el.getBoundingClientRect(), secs = [...el.querySelectorAll("[data-sec]")], at = x => { const r = x.getBoundingClientRect(); return [r.top - er.top + el.scrollTop, r.bottom - er.top + el.scrollTop]; };
        let d0 = 0, d1 = 0;
        while (d0 < secs.length - 1 && at(secs[d0])[1] < el.scrollTop - 2 * AHEAD) d0++;
        while (d1 < secs.length - 1 - d0 && at(secs[secs.length - 1 - d1])[0] > el.scrollTop + el.clientHeight + 2 * AHEAD) d1++;
        if (d0 || d1) { pend.current = true; keep(); setList(list.slice(d0, list.length - d1)); }
      }
    };
    let idle = 0;
    const upd = () => {
      if (!touched.current && Math.abs(el.scrollTop - placed.current) > 24) touched.current = true;  // you moved it (touch, wheel, keys, scrollbar...)
      const hb = ref.current.querySelector("[data-hdr]").getBoundingClientRect().bottom, secs = el.querySelectorAll("[data-sec]");
      if (!secs.length) return;
      let a = 0; secs.forEach((x, i) => { if (x.getBoundingClientRect().top <= hb + 8) a = i; });
      const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
      if (atEnd && (!browse || idxOf(list[list.length - 1]) === ALL.length - 1)) a = secs.length - 1;  // at the very end you are in the last chapter
      setCur(secs[a].getAttribute("data-key"));
      grow(false);
      clearTimeout(idle); idle = setTimeout(() => grow(true), 120);  // 120 ms without scrolling = at rest
    };
    const mark = () => { touched.current = true; };
    el.addEventListener("scroll", upd, { passive: true }); el.addEventListener("touchstart", mark, { passive: true }); el.addEventListener("wheel", mark, { passive: true });
    upd();
    return () => { clearTimeout(idle); el.removeEventListener("scroll", upd); el.removeEventListener("touchstart", mark); el.removeEventListener("wheel", mark); };
  }, [item, ver, list, lang]);

  const say = m => { setToast(m); clearTimeout(tt.current); tt.current = setTimeout(() => setToast(""), 1300); };
  const rangeKeys = m => { const lo = Math.min(m.a, m.to), hi = Math.max(m.a, m.to), o = []; for (let v = lo; v <= hi; v++) o.push(`${m.ck}:${v}`); return o; };
  const selKeys = m => rangeKeys(m).filter(k => ref.current && ref.current.querySelector(`[data-vk="${k}"]`));
  const copyStr = ks => { const L = act.current.lang, { b, n } = pk(ks[0]), d = CH[`${b} ${n}`], vs = ks.map(k => pk(k).v); const body = vs.map(v => [L !== "ta" && d.en[v], L !== "en" && d.ta[v]].filter(Boolean).join("\n")).join("\n"); return `${body}\n— ${disp(b, L)} ${n}:${vs.length > 1 ? vs[0] + "–" + vs[vs.length - 1] : vs[0]}` + (L === "ta" ? "" : " (ESV)"); };

  // Gestures on a verse (a mouse drag works the same as a finger):
  //  - drag right: add / remove favourite.  drag left: highlight / remove highlight.  The verse follows the finger and springs back.
  //  - press and hold, then drag over more verses: everything selected is copied the moment you let go.
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const FOLLOW = 90, COMMIT = 70;
    const s = { t: 0, x: 0, y: 0, fx: 0, fy: 0, mode: "", row: null, vk: "", dx: 0, raf: 0, crossed: false };
    const hb = () => { const h = el.querySelector("[data-hdr]"); return h ? h.getBoundingClientRect().bottom : 56; };
    const vkAt = (x, y) => { const e = document.elementFromPoint(Math.min(Math.max(x, 2), window.innerWidth - 2), Math.min(Math.max(y, hb() + 4), window.innerHeight - 8)); const v = e && e.closest ? e.closest("[data-vk]") : null; return v ? v.getAttribute("data-vk") : null; };
    const extend = (x, y) => { const m = mref.current; if (!m) return; const vk = vkAt(x, y); if (!vk) return; const p = pk(vk); if (`${p.b} ${p.n}` !== m.ck || p.v === m.to) return; setM({ ...m, to: p.v }); };
    const tick = () => { s.raf = 0; if (s.mode !== "select") return; const top = hb() + 70, bot = window.innerHeight - 90; let d = 0; if (s.fy < top) d = -(1.5 + (top - s.fy) / 14); else if (s.fy > bot) d = 1.5 + (s.fy - bot) / 14; if (d) { sc.current.scrollTop += d; extend(s.fx, s.fy); s.raf = requestAnimationFrame(tick); } };
    const pose = (row, dx) => {  // the verse follows the finger, a little slower once it is past the point where it counts
      const a = Math.abs(dx), t = Math.sign(dx) * (a < FOLLOW ? a : FOLLOW + (a - FOLLOW) * 0.25), w = row.parentElement;
      row.style.transition = "none"; row.style.transform = `translateX(${t}px)`;
      const on = w.querySelector(dx > 0 ? "[data-ih]" : "[data-ip]"), off = w.querySelector(dx > 0 ? "[data-ip]" : "[data-ih]"), p = Math.min(1, a / COMMIT);
      if (off) off.style.opacity = 0;
      if (on) { on.style.opacity = p; on.style.transform = `scale(${0.5 + 0.5 * p + (a >= COMMIT ? 0.2 : 0)})`; }
    };
    const release = row => {
      row.style.transition = "transform .5s cubic-bezier(.3,1.6,.5,1)"; row.style.transform = "translateX(0)";
      row.parentElement.querySelectorAll("[data-ih],[data-ip]").forEach(i => { i.style.opacity = 0; });
      setTimeout(() => { row.style.transition = ""; }, 520);
    };
    const begin = (x, y, tg) => {
      const row = tg && tg.closest ? tg.closest("[data-vk]") : null;
      if (!row || x < 28) return;  // a swipe from the very edge goes back
      clearTimeout(s.t); s.x = x; s.y = y; s.row = row; s.vk = row.getAttribute("data-vk"); s.mode = ""; s.dx = 0; s.crossed = false;
      s.t = setTimeout(() => { s.mode = "select"; s.fx = x; s.fy = y; const p = pk(s.vk); setM({ ck: `${p.b} ${p.n}`, a: p.v, to: p.v }); if (navigator.vibrate) navigator.vibrate(12); }, 420);
    };
    const move = (x, y, e) => {
      if (!s.row) return;
      if (s.mode === "select") { if (e.cancelable) e.preventDefault(); s.fx = x; s.fy = y; extend(x, y); if (!s.raf) s.raf = requestAnimationFrame(tick); return; }
      const dx = x - s.x, dy = y - s.y;
      if (s.mode === "") {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        clearTimeout(s.t); s.t = 0;
        if (Math.abs(dx) > Math.abs(dy) * 1.2) s.mode = "swipe"; else { s.mode = "scroll"; return; }
      }
      if (s.mode === "swipe") {
        if (e.cancelable) e.preventDefault();
        s.dx = dx; pose(s.row, dx);
        const c = Math.abs(dx) >= COMMIT; if (c && !s.crossed && navigator.vibrate) navigator.vibrate(10); s.crossed = c;
      }
    };
    const finish = commit => {
      clearTimeout(s.t); s.t = 0; cancelAnimationFrame(s.raf); s.raf = 0;
      const { mode, row, vk, dx } = s; s.mode = ""; s.row = null;
      if (mode === "select") {
        const m = mref.current; setM(null);
        const ks = commit && m ? selKeys(m) : [];
        if (ks.length) { copyText(copyStr(ks)); say(ks.length > 1 ? `Copied ${ks.length} verses` : "Copied"); }
      } else if (mode === "swipe") {
        release(row);
        if (commit && Math.abs(dx) >= COMMIT) {
          const a = act.current;
          if (dx > 0) { const was = a.favs.includes(vk); a.toggleFav(vk); say(was ? "Removed from favourites" : "Added to favourites"); }
          else { const was = !!a.hls[vk]; a.toggleHl(vk); say(was ? "Highlight removed" : "Highlighted"); }
        }
      }
    };
    const ts = e => begin(e.touches[0].clientX, e.touches[0].clientY, e.target);
    const tm = e => move(e.touches[0].clientX, e.touches[0].clientY, e);
    const te = () => finish(true), tc = () => finish(false);
    const md = e => { if (e.button === 0) begin(e.clientX, e.clientY, e.target); };
    const mm = e => move(e.clientX, e.clientY, e);
    const cm = e => e.preventDefault();
    el.addEventListener("touchstart", ts, { passive: true });
    el.addEventListener("touchmove", tm, { passive: false });
    el.addEventListener("touchend", te); el.addEventListener("touchcancel", tc);
    el.addEventListener("mousedown", md); window.addEventListener("mousemove", mm); window.addEventListener("mouseup", te);
    el.addEventListener("contextmenu", cm);
    return () => { clearTimeout(s.t); cancelAnimationFrame(s.raf); clearTimeout(tt.current); el.removeEventListener("touchstart", ts); el.removeEventListener("touchmove", tm); el.removeEventListener("touchend", te); el.removeEventListener("touchcancel", tc); el.removeEventListener("mousedown", md); window.removeEventListener("mousemove", mm); window.removeEventListener("mouseup", te); el.removeEventListener("contextmenu", cm); };
  }, []);

  const showEN = lang !== "ta", showTA = lang !== "en";
  const sec = { background: "none", border: "none", height: 36, padding: 0, cursor: "pointer", color: C.text, fontFamily: sans, display: "flex", alignItems: "center", justifyContent: "center" };
  return (
    <div ref={ref} style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 10, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div data-hdr="1" style={{ flex: "0 0 auto", background: C.bg }}>
        <div style={{ maxWidth: 430, margin: "0 auto", padding: `calc(10px + ${TOP}) 20px 10px`, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline" }}>
            <button onClick={close} aria-label="Back" style={{ ...backBtn, margin: "-12px 0 -12px -22px", padding: "12px 9px 12px 16px" }}><Chev d="left" h={xh(17)} /></button>
            <div style={{ fontFamily: sans, fontSize: 17, fontWeight: 600, color: C.accent, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(() => { const [tb, tn] = (cur && list.find(([b, n]) => b + " " + n === cur)) || item.ch[0]; return `${nm(tb, lang)} ${tn}`; })()}</div>
          </div>
          <div style={{ display: "flex", background: C.card, borderRadius: RAD, overflow: "hidden", flexShrink: 0 }}>
            <button onClick={() => setSize(Math.max(10, size - 2))} aria-label="Smaller text" style={{ ...sec, width: 42, fontSize: 22, fontWeight: 300 }}>−</button>
            <button onClick={() => setLang(LANGS[(LANGS.indexOf(lang) + 1) % 3])} aria-label="Language" style={{ ...sec, width: 52, borderLeft: `1px solid ${C.bg}`, borderRight: `1px solid ${C.bg}` }}><LangLabel l={lang} /></button>
            <button onClick={() => setSize(Math.min(28, size + 2))} aria-label="Larger text" style={{ ...sec, width: 42, fontSize: 22, fontWeight: 300 }}>+</button>
          </div>
        </div>
      </div>
      <div ref={sc} style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", overscrollBehavior: browse ? "none" : "contain" }}>
      <div key={item.ch.map(c => c.join(" ")).join("|")} style={{ maxWidth: 430, margin: "0 auto", padding: browse ? "40px 28px calc(80px + env(safe-area-inset-bottom, 0px))" : "40px 28px calc(40px + env(safe-area-inset-bottom, 0px))" }}>
        {list.map(([b, n], ci) => {
          const k = b + " " + n, d = CH[k], target = k === item.ch[0][0] + " " + item.ch[0][1];  // item.hl belongs to the opened chapter only
          const vs = d ? [...new Set([...(showEN ? Object.keys(d.en) : []), ...(showTA ? Object.keys(d.ta) : [])])].map(Number).sort((x, y) => x - y) : [];
          return (
            <section key={k} data-sec="1" data-key={k} style={{ marginBottom: 48 }}>
              {ci > 0 && <div style={{ fontFamily: sans, color: C.accent, fontSize: 17, fontWeight: 600, marginBottom: 14 }}>{nm(b, lang)} {n}</div>}
              <div data-vs={k} style={{ fontSize: size, lineHeight: 1.65, color: C.text }}>
                {vs.length ? vs.map(v => {
                  const vk = `${b} ${n}:${v}`, sel = menu && menu.ck === k && v >= Math.min(menu.a, menu.to) && v <= Math.max(menu.a, menu.to);
                  return (
                    <div key={v} style={{ position: "relative", margin: "0 -8px 6px" }}>
                      <div data-ih="1" style={{ position: "absolute", left: -12, top: 0, bottom: 0, display: "flex", alignItems: "center", color: C.accent, opacity: 0, transition: "opacity .2s" }}>{Ico.heart(true)}</div>
                      <div data-ip="1" style={{ position: "absolute", right: -12, top: 0, bottom: 0, display: "flex", alignItems: "center", color: C.accent, opacity: 0, transition: "opacity .2s" }}>{Ico.pen(false)}</div>
                    <div data-vk={vk} data-hl={target && item.hl === v ? 1 : undefined} style={{ position: "relative", display: "flex", alignItems: "baseline", padding: "4px 8px", borderRadius: RAD, transition: "background .15s", touchAction: "pan-y", background: sel ? C.select : hls[vk] || (target && jump === v) ? C.hl : "transparent" }}>
                      <div style={{ flex: "0 0 2em", fontSize: `${Math.max(9, size * 0.68)}px`, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3 }}>
                        <span style={{ fontFamily: sans, fontWeight: 600, lineHeight: 1, color: C.accent, fontVariantNumeric: "lining-nums tabular-nums" }}>{v}</span>
                        {favs.includes(vk) && <span style={{ color: C.accent, display: "flex" }}>{Ico.heartS()}</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {showEN && d.en[v] && <div lang="en" style={{ fontFamily: serif, textAlign: "justify", hyphens: "auto", WebkitHyphens: "auto" }}>{d.en[v]}</div>}
                        {showTA && d.ta[v] && <div lang="ta" style={{ fontFamily: taFont, fontSize: "0.95em", lineHeight: 1.75, textAlign: "left", marginTop: showEN ? 6 : 0, color: showEN ? C.text : C.text }}>{d.ta[v]}</div>}
                      </div>
                    </div>
                    </div>
                  );
                }) : <div style={{ color: C.text, fontFamily: sans, fontSize: 15 }}>{bibleReady(lang) ? "The full text for this chapter loads from your Bible files in the PWA build." : bibleFailed() ? "Couldn't load the Bible. Check your connection." : "Loading…"}</div>}
              </div>
            </section>
          );
        })}
        {!browse && <Pill onClick={advance}>{last ? "Done" : "Next"}</Pill>}
      </div>
      </div>
      {toast && <div style={{ position: "fixed", left: 0, right: 0, bottom: "calc(40px + env(safe-area-inset-bottom, 0px))", display: "flex", justifyContent: "center", zIndex: 31, pointerEvents: "none" }}><div style={{ background: C.card, color: C.text, fontSize: 14, fontFamily: sans, padding: "9px 16px", borderRadius: RAD }}>{toast}</div></div>}
    </div>
  );
}

function BibleTab({ go, lang, setLang, favs, toggleFav, active }) {
  const ver = useBible();
  const [q, setQ] = useState("");
  const [book, setBook] = useState(null);
  const [showFavs, setShowFavs] = useState(false);
  const rootRef = useRef(null);
  useSwipeBack(rootRef, () => { if (showFavs) setShowFavs(false); else setBook(null); }, active && (showFavs || !!book));
  const s = q.trim();
  const m = s.match(/^(\d?\s*[a-z][a-z ]*?)\s*(\d+)(?::(\d+))?$/i);
  let target = null;
  if (m) { const k = norm(m[1]); const f = BOOKS.find(([b]) => norm(b).startsWith(k) || k === norm(b) + "s"); if (f && +m[2] >= 1 && +m[2] <= f[1]) target = { b: f[0], n: +m[2], v: m[3] ? +m[3] : undefined }; }
  const [limit, setLimit] = useState(60);
  useEffect(() => { setLimit(60); }, [s, lang]);
  const { hits, total } = useMemo(() => (s.length < 2 || target ? { hits: [], total: 0 } : searchBible(s, lang, limit)), [s, !!target, lang, ver, limit]);
  const mark = tx => tx.split(new RegExp("(" + s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/['\u2018\u2019]/g, "['\u2018\u2019]").replace(/["\u201c\u201d]/g, "[\"\u201c\u201d]") + ")", "i")).map((p, i) => i % 2 ? <mark key={i} style={{ background: C.select, color: C.text, borderRadius: 3 }}>{p}</mark> : p);
  const lines = (x, hl) => [lang !== "ta" && x.en ? ["en", x.en] : null, lang !== "en" && x.ta ? ["ta", x.ta] : null].filter(Boolean).map(([l, tx]) => <div key={l} lang={l} style={{ fontFamily: l === "ta" ? taFont : serif, fontSize: l === "ta" ? 15 : 16, lineHeight: 1.55, marginTop: l === "ta" && lang === "both" ? 4 : 0, color: l === "ta" && lang === "both" ? C.text : C.text }}>{hl ? mark(tx) : tx}</div>);
  const group = (title, list, off) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ color: C.accent, fontSize: lang === "ta" ? 17 : 13, fontWeight: 600, letterSpacing: lang === "ta" ? 0 : 0.6, textTransform: "uppercase", margin: "0 8px 8px" }}>{title}</div>
      <div style={{ background: C.card, borderRadius: RAD, overflow: "hidden" }}>
        {list.map(([b, cnt], i) => <div key={b} onClick={() => (cnt === 1 ? go({ ch: [[b, 1]] }) : setBook(b))} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 52, boxSizing: "border-box", padding: "0 20px", borderTop: i ? `1px solid ${C.bg}` : "none", cursor: "pointer", fontSize: 17 }}><span>{disp(b, lang)}</span><span style={{ color: C.text, display: "flex", alignItems: "center", gap: 10 }}>{lang === "both" && <span style={{ fontSize: 15 }}>{TA_NAMES[off + i]}</span>}<Chev /></span></div>)}
      </div>
    </div>
  );
  const sub = lang === "en" ? "English Standard Version (ESV)" : lang === "ta" ? "Tamil Bible" : "ESV · Tamil Bible";

  // the overlays keep their top bar fixed (head) and scroll only the content under it (body)
  const favsHead = showFavs && (
    <div style={{ display: "flex", alignItems: "baseline", marginBottom: 20 }}>
      <button onClick={() => setShowFavs(false)} aria-label="Back" style={{ ...backBtn, margin: "-12px 0 -12px -16px", padding: "12px 10px 12px 16px" }}><Chev d="left" h={xh(34)} /></button>
      <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.8, margin: 0 }}>Favourites</h1>
    </div>
  );
  const favsBody = showFavs && (favs.length ? (
    <div style={{ background: C.card, borderRadius: RAD, overflow: "hidden" }}>
      {[...favs].reverse().map((k, i) => { const { b, n, v } = pk(k), d = CH[b + " " + n] || { en: {}, ta: {} }, x = { en: d.en[v] || "", ta: d.ta[v] || "" }; return (
        <div key={k} onClick={() => go({ ch: [[b, n]], hl: v })} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "16px 12px 16px 20px", borderTop: i ? `1px solid ${C.bg}` : "none", cursor: "pointer" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: C.accent, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{disp(b, lang)} {n}:{v}</div>
            {lines(x, false)}
          </div>
          <button onClick={e => { e.stopPropagation(); toggleFav(k); }} aria-label="Remove favourite" style={{ background: "none", border: "none", color: C.accent, padding: 8, display: "flex", cursor: "pointer" }}>{Ico.heart(true)}</button>
        </div>); })}
    </div>
  ) : <div style={{ color: C.text, textAlign: "center", padding: "40px 20px", lineHeight: 1.5 }}>Swipe a verse to the right to save it here.</div>);

  const bookHead = book && (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline" }}>
        <button onClick={() => setBook(null)} aria-label="Back" style={{ ...backBtn, margin: "-12px 0 -12px -16px", padding: "12px 10px 12px 16px" }}><Chev d="left" h={xh(28)} /></button>
        <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5, margin: 0, color: C.accent }}>{disp(book, lang)}</h2>
      </div>
      <LangBtn lang={lang} setLang={setLang} />
    </div>
  );
  const bookBody = book && (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
      {Array.from({ length: BOOKS.find(([b]) => b === book)[1] }, (_, i) => <button key={i} onClick={() => go({ ch: [[book, i + 1]] })} style={{ aspectRatio: "1", borderRadius: RAD, border: "none", background: C.card, color: C.text, fontSize: 17, fontFamily: sans, cursor: "pointer" }}>{i + 1}</button>)}
    </div>
  );

  return (
    <>
    <div key="list" style={{ marginTop: TOP, height: `calc(100dvh - ${NAV} - ${TOP})`, overflowY: "auto", overflowX: "hidden", boxSizing: "border-box", padding: "28px 24px 32px" }}>  {/* starts below the status bar, so text never scrolls under the clock */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1, margin: 0 }}>{lang === "ta" ? "வேதாகமம்" : "Bible"}</h1>
        <LangBtn lang={lang} setLang={setLang} />
      </div>
      <div style={{ color: C.grey, fontSize: 13, margin: "0 0 24px" }}>{sub}</div>
      <div style={{ position: "relative", marginBottom: 20 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search, or go to John 3:16" style={{ display: "block", width: "100%", boxSizing: "border-box", background: C.card, border: "none", borderRadius: RAD, height: 52, padding: "0 44px 0 16px", color: C.text, fontSize: 17, fontFamily: sans, outline: "none" }} />
        {q && <button onClick={() => setQ("")} aria-label="Clear search" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 6, display: "flex", cursor: "pointer", color: C.text }}><svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="currentColor" /><path d="M6.5 6.5l7 7M13.5 6.5l-7 7" stroke={C.bg} strokeWidth="1.8" strokeLinecap="round" /></svg></button>}
      </div>
      {total > 0 && <div style={{ color: C.grey, fontSize: 12, margin: "-10px 4px 14px" }}>{total === 1 ? "1 result" : `${total} results`}{total > hits.length ? ` · showing first ${hits.length}` : ""}</div>}
      {target ? (
        <div onClick={() => go({ ch: [[target.b, target.n]], hl: target.v })} style={{ background: C.card, borderRadius: RAD, height: 52, boxSizing: "border-box", padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontSize: 17 }}>
          <span style={{ color: C.accent, fontWeight: 600 }}>Go to {disp(target.b, lang)} {target.n}{target.v ? ":" + target.v : ""}</span><span style={{ color: C.text, display: "flex" }}><Chev /></span>
        </div>
      ) : s.length > 1 ? (
        <div>
          {hits.length ? <div style={{ background: C.card, borderRadius: RAD, overflow: "hidden" }}>
            {hits.map((h, i) => <div key={i} onClick={() => go({ ch: [[h.b, h.n]], hl: h.v })} style={{ padding: "16px 20px", borderTop: i ? `1px solid ${C.bg}` : "none", cursor: "pointer" }}>
              <div style={{ color: C.accent, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{disp(h.b, lang)} {h.n}:{h.v}</div>
              {lines(h, true)}
            </div>)}
          </div> : <div style={{ color: C.text, textAlign: "center", padding: "32px 0" }}>No results for “{s}”</div>}
          {total > hits.length && <button onClick={() => setLimit(l => l + 60)} style={{ display: "block", margin: "6px auto 0", background: "none", border: "none", color: C.accent, fontSize: 14, fontFamily: sans, padding: "14px 20px", cursor: "pointer" }}>Show more</button>}
        </div>
      ) : (<>
        <div onClick={() => setShowFavs(true)} style={{ border: `1.5px solid ${C.accent}`, borderRadius: RAD, height: 52, boxSizing: "border-box", padding: "0 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontSize: 17, marginBottom: 28 }}>
          <span style={{ color: C.accent, display: "flex" }}>{Ico.heart(true)}</span><span style={{ flex: 1 }}>Favourites</span><span style={{ color: C.accent }}>{favs.length}</span><span style={{ color: C.accent, display: "flex" }}><Chev /></span>
        </div>
        {group(lang === "ta" ? "பழைய ஏற்பாடு" : "Old Testament", BOOKS.slice(0, 39), 0)}{group(lang === "ta" ? "புதிய ஏற்பாடு" : "New Testament", BOOKS.slice(39), 39)}
        <div style={{ textAlign: "center", color: C.grey, fontSize: 13, padding: "4px 0 24px" }}>Created by Benjamin Hanigraf</div>
      </>)}
    </div>
    {(showFavs || book) && (
      <div key={showFavs ? "favs" : "book"} ref={rootRef} style={{ position: "fixed", inset: `0 0 ${NAV} 0`, zIndex: 4, background: C.bg, display: "flex", flexDirection: "column", overflow: "hidden", animation: "wInR .28s cubic-bezier(.2,.8,.2,1)" }}>
        <div style={{ flex: "0 0 auto", maxWidth: 430, width: "100%", margin: "0 auto", boxSizing: "border-box", padding: `calc(28px + ${TOP}) 24px 0` }}>{showFavs ? favsHead : bookHead}</div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", overscrollBehavior: "contain" }}>
          <div style={{ maxWidth: 430, margin: "0 auto", padding: "0 24px 32px" }}>{showFavs ? favsBody : bookBody}</div>
        </div>
      </div>
    )}
    </>
  );
}

function Calendar({ start, today, view, status, pick, close, mark }) {
  const b = addDays(start, view);
  const [ym, setYm] = useState([b.getFullYear(), b.getMonth()]);
  const [mdir, setMdir] = useState(0);
  const gridRef = useRef(null), markRef = useRef(mark), stRef = useRef(status), ps = useRef({ t: 0, on: false, x: 0, y: 0, last: -1, quiet: false });
  markRef.current = mark; stRef.current = status;
  const rootRef = useRef(null);
  useSwipeBack(rootRef, close, true);
  useEffect(() => {
    const el = rootRef.current; if (!el) return;
    const s = ps.current;
    const cellAt = (x, y) => { const e = document.elementFromPoint(x, y), c = e && e.closest ? e.closest("[data-dn]") : null; return c ? +c.getAttribute("data-dn") : -1; };
    const hit = (x, y) => { const d = cellAt(x, y); if (d >= 0 && d !== s.last) { s.last = d; markRef.current(d, s.mode); } };
    const begin = (x, y) => { if (cellAt(x, y) < 0) return; s.x = x; s.y = y; s.on = false; s.last = -1; clearTimeout(s.t); s.t = setTimeout(() => { const d0 = cellAt(s.x, s.y); s.mode = !(dayItems(d0).length && stRef.current(d0) === "full"); s.on = true; s.quiet = true; hit(s.x, s.y); if (navigator.vibrate) navigator.vibrate(12); }, 400); };
    const move = (x, y, e) => { if (s.on) { if (e.cancelable) e.preventDefault(); hit(x, y); } else if (s.t && Math.hypot(x - s.x, y - s.y) > 10) { clearTimeout(s.t); s.t = 0; } };
    const end = e => { clearTimeout(s.t); s.t = 0; if (s.on) { if (e.cancelable) e.preventDefault(); s.on = false; setTimeout(() => { s.quiet = false; }, 80); } };
    const ts = e => begin(e.touches[0].clientX, e.touches[0].clientY);
    const tm = e => move(e.touches[0].clientX, e.touches[0].clientY, e);
    const md = e => { if (e.button === 0) begin(e.clientX, e.clientY); };
    const mm = e => move(e.clientX, e.clientY, e);
    el.addEventListener("touchstart", ts, { passive: true });
    el.addEventListener("touchmove", tm, { passive: false });
    el.addEventListener("touchend", end, { passive: false });
    el.addEventListener("touchcancel", end, { passive: false });
    el.addEventListener("mousedown", md);
    window.addEventListener("mousemove", mm);
    window.addEventListener("mouseup", end);
    return () => { clearTimeout(s.t); el.removeEventListener("touchstart", ts); el.removeEventListener("touchmove", tm); el.removeEventListener("touchend", end); el.removeEventListener("touchcancel", end); el.removeEventListener("mousedown", md); window.removeEventListener("mousemove", mm); window.removeEventListener("mouseup", end); };
  }, []);
  const [y, mo] = ym;
  const lead = new Date(y, mo, 1).getDay();
  const days = new Date(y, mo + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const shift = d => { const x = new Date(y, mo + d, 1); setMdir(d); setYm([x.getFullYear(), x.getMonth()]); };
  const sw = useRef(null);
  const arrow = { background: "none", border: "none", color: C.accent, fontSize: 26, cursor: "pointer", padding: "6px 10px", display: "inline-flex", alignItems: "center", fontSize: 22 };
  return (
    <div ref={rootRef} onTouchStart={e => { sw.current = [e.touches[0].clientX, e.touches[0].clientY]; }} onTouchEnd={e => { const s0 = sw.current; sw.current = null; if (!s0 || s0[0] < 28 || ps.current.on || ps.current.quiet) return; const dx = e.changedTouches[0].clientX - s0[0], dy = e.changedTouches[0].clientY - s0[1]; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) shift(dx < 0 ? 1 : -1); }} style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 20, overflowY: "auto", overflowX: "hidden", overscrollBehavior: "contain" }}>
      <div style={{ maxWidth: 430, margin: "0 auto", padding: `calc(28px + ${TOP}) 24px calc(60px + env(safe-area-inset-bottom, 0px))` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "baseline", minWidth: 0 }}>
          <button onClick={close} aria-label="Back" style={{ ...backBtn, margin: "-12px 0 -12px -16px", padding: "12px 10px 12px 16px" }}><Chev d="left" h={xh(30)} /></button>
          <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5, margin: 0 }}>{new Date(y, mo, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</h1>
          </div>
          
        </div>
        <div key={`${y}-${mo}`} ref={gridRef} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 8, textAlign: "center", animation: mdir ? `${mdir > 0 ? "wInR" : "wInL"} .28s cubic-bezier(.2,.8,.2,1)` : "none" }}>
          {"SMTWTFS".split("").map((l, i) => <div key={i} style={{ color: C.accent, fontSize: 13, paddingBottom: 6 }}>{l}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const ds = iso(new Date(y, mo, d)), dn = dayDiff(ds, start), inn = dn >= 0 && dn < planLen(), s = inn ? status(dn) : "out";
            return (
              <button key={i} data-dn={inn ? dn : undefined} disabled={!inn} onClick={() => { if (!ps.current.quiet) pick(dn); }} style={{ justifySelf: "center", width: 44, height: 44, borderRadius: 22, cursor: inn ? "pointer" : "default", fontSize: 17, fontFamily: sans, fontWeight: ds === today ? 700 : 400, background: s === "full" ? C.accent : "transparent", border: s === "part" ? `2px solid ${C.accent}` : "2px solid transparent", color: s === "full" ? C.text : inn ? (ds === today ? C.accent : C.text) : C.grey, padding: 0 }}>{d}</button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// The week row: drag left/right and the neighbouring weeks slide in following the finger.
function WeekStrip({ off, setOff, build, can, render }) {
  const box = useRef(null), track = useRef(null), g = useRef(null), lastDrag = useRef(0), busy = useRef(false);
  const put = (x, anim) => { const t = track.current; if (!t) return; t.style.transition = anim ? "transform .28s cubic-bezier(.2,.8,.2,1)" : "none"; t.style.transform = `translateX(calc(-33.3333% + ${x}px))`; };
  useLayoutEffect(() => { put(0, false); busy.current = false; }, [off]);
  const down = e => { if (busy.current || (e.pointerType === "mouse" && e.button !== 0)) return; g.current = { x: e.clientX, y: e.clientY, t: Date.now(), on: false, id: e.pointerId, dx: 0 }; };
  const move = e => {
    const q = g.current; if (!q || e.pointerId !== q.id) return;
    const dx = e.clientX - q.x, dy = e.clientY - q.y;
    if (!q.on) { if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return; q.on = true; try { box.current.setPointerCapture(e.pointerId); } catch {} }
    q.dx = dx; put(can(off + (dx < 0 ? 1 : -1)) ? dx : dx * 0.25, false);
  };
  const up = () => {
    const q = g.current; g.current = null; if (!q || !q.on) return;
    lastDrag.current = Date.now();
    const w = box.current.clientWidth, dir = q.dx < 0 ? 1 : -1, fast = Math.abs(q.dx) / Math.max(1, Date.now() - q.t) > 0.5;
    if (can(off + dir) && (Math.abs(q.dx) > w * 0.25 || fast)) { busy.current = true; put(-dir * w, true); setTimeout(() => setOff(o => o + dir), 280); }
    else put(0, true);
  };
  const cancel = () => { if (g.current && g.current.on) put(0, true); g.current = null; };
  return (
    <div ref={box} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}
      onClickCapture={e => { if (Date.now() - lastDrag.current < 400) { e.stopPropagation(); e.preventDefault(); } }}
      style={{ overflow: "hidden", touchAction: "pan-y" }}>
      <div ref={track} style={{ display: "flex", width: "300%", transform: "translateX(calc(-33.3333% + 0px))" }}>
        {[off - 1, off, off + 1].map(o => <div key={o} style={{ width: "33.3333%", flexShrink: 0, display: "flex" }}>{render(build(o))}</div>)}
      </div>
    </div>
  );
}

export default function App() {
  const today = iso(new Date());
  const [start, setStart] = useState(() => store.get("start", null, okStart));
  const [draft, setDraft] = useState(today);
  const [tab, setTab] = useState("today");
  const [view, setView] = useState(() => { const s = store.get("start", null, okStart); return s ? Math.max(0, dayDiff(iso(new Date()), s)) : 0; });
  const [done, setDone] = useState(() => store.get("done", {}, okDone));
  const [open, setOpen] = useState(null);
  const [size, setSize] = useState(() => store.get("size", 20, okSize));
  const [lang, setLang] = useState(() => store.get("lang", "en", okLang));
  const [favs, setFavs] = useState(() => store.get("favs", [], okFavs));
  const [hls, setHls] = useState(() => store.get("hls", {}, okHls));
  const [cal, setCal] = useState(false);
  const [artTap, setArtTap] = useState(0);
  const [weekOff, setWeekOff] = useState(0);  // weeks away from the current one; goes back to 0 when you return to the app
  const [, refresh] = useReducer(x => x + 1, 0);
  useEffect(() => {
    let day = iso(new Date());
    const sync = () => {
      const t = iso(new Date());
      if (t !== day && start) { const prev = Math.max(0, dayDiff(day, start)), cur = Math.max(0, dayDiff(t, start)); setView(v => (v === prev ? cur : v)); }
      day = t; refresh();
    };
    const iv = setInterval(sync, 60000);
    const vis = () => { if (!document.hidden) setWeekOff(0); sync(); };
    window.addEventListener("resize", sync); window.addEventListener("focus", sync); document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(iv); window.removeEventListener("resize", sync); window.removeEventListener("focus", sync); document.removeEventListener("visibilitychange", vis); };
  }, [start]);
  useEffect(() => { store.set("start", start); }, [start]);
  useEffect(() => { store.set("done", done); }, [done]);
  useEffect(() => { store.set("size", size); }, [size]);
  useEffect(() => { store.set("lang", lang); }, [lang]);
  useEffect(() => { store.set("favs", favs); }, [favs]);
  useEffect(() => { store.set("hls", hls); }, [hls]);
  // no rubber-banding on the Today page (it never scrolls); the Bible list keeps the normal spring
  useEffect(() => { document.documentElement.style.overscrollBehavior = tab === "today" ? "none" : ""; }, [tab]);
  const toggleFav = k => setFavs(f => (f.includes(k) ? f.filter(x => x !== k) : [...f, k]));
  const markDay = (dn, on) => setDone(d => { const o = { ...d }; dayItems(dn).forEach(i => { if (on) o[i.key] = true; else delete o[i.key]; }); return o; });
  const toggleHl = k => setHls(h => { const o = { ...h }; if (o[k]) delete o[k]; else o[k] = 1; return o; });
  const toggle = k => setDone(d => ({ ...d, [k]: !d[k] }));

  const shell = { maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: C.bg, color: C.text, fontFamily: sans, padding: `${TOP} 24px ${NAVPAD}`, boxSizing: "border-box", overflowX: "hidden" };

  if (!start) return (
    <div style={{ ...shell, display: "flex", flexDirection: "column", justifyContent: "center", gap: 48, paddingBottom: 48 }}>
      <style>{CSS}</style>
      <h1 style={{ fontSize: 48, fontWeight: 700, letterSpacing: -1.5, margin: 0 }}>Read</h1>
      <div style={{ background: C.card, borderRadius: RAD, padding: "6px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 17 }}>Start date</span>
        <input type="date" value={draft} onChange={e => setDraft(e.target.value)} style={{ background: "none", border: "none", color: C.text, fontSize: 17, fontFamily: sans, colorScheme: "dark", padding: "14px 0" }} />
      </div>
      <Pill onClick={() => { if (!okStart(draft)) return; setStart(draft); setView(Math.max(0, dayDiff(today, draft))); }}>Begin</Pill>
    </div>
  );

  plan.dow = new Date(start + "T00:00").getDay();
  const todayN = Math.max(0, dayDiff(today, start));
  const n = view;
  const catchUp = isCatchUp(n);
  let items = dayItems(n);
  const finished = items.filter(i => done[i.key]).length;
  const next = items.find(i => !done[i.key]);
  const dateStr = longDate(addDays(start, n));

  const seen = {};
  Object.keys(done).filter(k => done[k]).forEach(k => { const [d, tr] = k.split(":").map(Number); chaptersFor(tr, readIdx(d)).forEach(([b, c]) => { (seen[b] = seen[b] || new Set()).add(c); }); });
  const chaptersDone = Object.values(seen).reduce((s, x) => s + x.size, 0);
  const booksDone = BOOKS.filter(([b, c]) => seen[b] && seen[b].size === c).length;
  const dayStatus = d => { if (isCatchUp(d)) return d > 0 && dayStatus(d - 1) === "full" ? "full" : "rest"; const it = dayItems(d); if (!it.length) return "rest"; const c = it.filter(i => done[i.key]).length; return c === it.length ? "full" : c ? "part" : "none"; };
  let streak = 0; for (let d = Math.min(todayN - (dayStatus(todayN) === "full" ? 0 : 1), planLen()); d >= 0; d--) { const s = dayStatus(d); if (s === "rest") continue; if (s === "full") streak++; else break; }

  const nextAfter = k => { const i = items.findIndex(x => x.key === k); return i < 0 ? undefined : [...items.slice(i + 1), ...items.slice(0, i)].find(x => !done[x.key]); };
  const readAhead = () => { for (let d = n + 1; d < planLen(); d++) { const it = dayItems(d).find(i => !done[i.key]); if (it) { setView(d); setOpen(it); return; } } };
  const prog = d => { if (isCatchUp(d)) return dayStatus(d) === "full" ? 1 : 0; const it = dayItems(d); return it.length ? it.filter(i => done[i.key]).length / it.length : 0; };
  const rs = Math.min(40, Math.max(32, Math.round(window.innerHeight * 0.043)));
  const artI = (((dayDiff(today, "2026-01-01") + artTap) % ARTS.length) + ARTS.length) % ARTS.length;
  const base = new Date(today + "T00:00"), dow = base.getDay();
  const weekAt = o => Array.from({ length: 7 }, (_, i) => { const dt = new Date(base); dt.setDate(dt.getDate() + i - dow + 7 * o); const ds = iso(dt), dn = dayDiff(ds, start), inn = dn >= 0 && dn < planLen(); return { d: dt.getDate(), s: inn ? dayStatus(dn) : "out", inn, today: ds === today, dn, frac: inn ? prog(dn) : 0 }; });
  const canWeek = o => { if (o === 0) return true; const dn0 = dayDiff(iso(addDays(today, 7 * o - dow)), start); return dn0 + 6 >= 0 && dn0 < planLen(); };
  const renderWeek = cells => cells.map((c, i) => (
    <div key={i} style={{ flex: 1, textAlign: "center" }}>
      <div style={{ color: C.accent, fontSize: 11, marginBottom: 6 }}>{"SMTWTFS"[i]}</div>
      {c.inn ? (
        <DayRing frac={c.frac} size={rs} onClick={e => { e.stopPropagation(); setView(c.dn); }} style={{ margin: "0 auto", cursor: "pointer" }}>
          <div style={{ width: rs - 10, height: rs - 10, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: c.today ? 700 : 500, background: c.today ? C.accent : c.dn === n ? C.card : "transparent", color: c.today ? C.text : C.text }}>{c.d}</div>
        </DayRing>
      ) : <div style={{ width: rs, height: rs, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: C.grey }}>{c.d}</div>}
    </div>
  ));

  return (
    <div style={tab === "today" ? { ...shell, height: "100dvh", minHeight: 0, paddingBottom: 0, overflow: "hidden" } : { ...shell, height: "100dvh", minHeight: 0, padding: 0, overflow: "hidden" }}>
      <style>{CSS}</style>
      {tab === "bible" ? <BibleTab go={setOpen} lang={lang} setLang={setLang} favs={favs} toggleFav={toggleFav} active={!open && !cal} /> : (
        <div style={{ height: `calc(100dvh - ${NAV} - ${TOP})`, boxSizing: "border-box", paddingTop: 16, display: "flex", flexDirection: "column", gap: cl(14, 2.1, 22), overflow: "hidden" }}>
          <Art i={artI} onTap={() => setArtTap(k => k + 1)} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[[`${Math.round(chaptersDone / TOTAL * 100)}%`, "of the Bible"], [booksDone || "-", "books read"], [streak, "day streak"]].map(([v, l]) => (
                <div key={l} style={{ background: C.card, borderRadius: RAD, padding: `${cl(12, 1.8, 18)} 14px` }}>
                  <div style={{ fontSize: cl(24, 3.5, 30), fontWeight: 700, letterSpacing: -0.4 }}>{v}</div>
                  <div style={{ color: C.text, fontSize: 12, marginTop: 1 }}>{l}</div>
                </div>
              ))}
            </div>

            <div onClick={() => setCal(true)} style={{ background: C.card, borderRadius: RAD, padding: `${cl(10, 1.6, 15)} 8px`, cursor: "pointer" }}>
              <WeekStrip off={weekOff} setOff={setWeekOff} build={weekAt} can={canWeek} render={renderWeek} />
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ color: C.accent, fontSize: 13, height: 17, marginBottom: 2 }}>{catchUp ? "Catch-up" : ""}</div>
                <h1 style={{ fontSize: cl(20, 2.9, 26), fontWeight: 700, letterSpacing: -0.5, margin: 0, whiteSpace: "nowrap", lineHeight: 1.2 }}>{dateStr}</h1>
              </div>
            </div>

            <div style={{ height: `calc(3 * ${ROWH})`, overflow: "hidden", flexShrink: 0 }}>
            {items.length ? (
              <div style={{ background: C.card, borderRadius: RAD, overflow: "hidden" }}>
                {items.map((it, i) => (
                  <div key={it.key} onClick={() => setOpen(it)} style={{ display: "flex", alignItems: "center", gap: 12, height: ROWH, boxSizing: "border-box", padding: "0 14px", borderTop: i ? `1px solid ${C.bg}` : "none", cursor: "pointer" }}>
                    <Check on={!!done[it.key]} onClick={() => toggle(it.key)} />
                    <div style={{ flex: 1 }}>
                      {catchUp && <div style={{ color: C.accent, fontSize: 12, marginBottom: 1 }}>{addDays(start, it.n).toLocaleDateString("en-GB", { weekday: "long" })}</div>}
                      <div style={{ fontSize: cl(16, 2.1, 18), fontWeight: 400, color: done[it.key] ? C.accent : C.text }}>{label(it.ch, lang)}</div>
                    </div>
                    <span style={{ color: C.text, display: "flex", fontSize: 16 }}><Chev /></span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ background: C.card, borderRadius: RAD, padding: "24px 20px", textAlign: "center", color: C.text, fontSize: 15, lineHeight: 1.5 }}>
                {catchUp ? "A day to rest. Open any unfinished day from the calendar." : "The plan is complete."}
              </div>
            )}
            </div>

            {/* the button sits exactly halfway between the end of the list and the bottom bar */}
            <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", visibility: items.length ? "visible" : "hidden" }}><div style={{ width: "100%" }}><Pill ghost={!next} onClick={() => (next ? setOpen(next) : readAhead())}>{next ? (finished ? "Continue" : "Start") : "Read next portion"}</Pill></div></div>
          </div>
        </div>
      )}

      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 5, background: C.bg, borderTop: `1px solid ${C.card}`, height: NAV, boxSizing: "border-box" }}>
        <div style={{ maxWidth: 430, margin: "0 auto", display: "flex" }}>
          {[["today", "Today"], ["bible", "Bible"]].map(([k, l]) => (
            <button key={k} onClick={() => { setTab(k); setWeekOff(0); if (k === "today") setView(todayN); }} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", padding: "9px 0 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, color: tab === k ? C.accent : C.grey, fontFamily: sans, fontSize: 11, fontWeight: 500 }}>{ICONS[k]}{l}</button>
          ))}
        </div>
      </nav>

      {cal && <Calendar mark={markDay} start={start} today={today} view={n} status={dayStatus} close={() => setCal(false)} pick={d => { setView(d); setCal(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}
      {open && <Reader item={open} size={size} setSize={setSize} lang={lang} setLang={setLang} favs={favs} hls={hls} toggleFav={toggleFav} toggleHl={toggleHl} close={() => setOpen(null)} go={setOpen} last={!open.key || !nextAfter(open.key)} advance={() => { if (open.key && !done[open.key]) toggle(open.key); setOpen((open.key && nextAfter(open.key)) || null); }} />}
    </div>
  );
}
