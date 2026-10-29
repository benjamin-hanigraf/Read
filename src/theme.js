// The app's whole palette: seven colours, nothing else is used anywhere (every other tone is one of these).
//   ACCENT      buttons, links, labels, rings, the artwork
//   WHITE       text
//   BLACK       backgrounds
//   GREY_DARK   everything that is a surface: cards, list rows, buttons, inputs, toggles, the toast
//   GREY_LIGHT  dim text only (never used as a surface, and GREY_DARK is never used for text)
//   SELECT      a darker accent: verses being selected, search matches
//   HIGHLIGHT   an even darker accent: highlighted verses (and the faintest strokes of the artwork)
// Change ACCENT and SELECT and HIGHLIGHT follow, so does everything that uses them.
export const ACCENT = "#0a84ff";
export const WHITE = "#ffffff";
export const BLACK = "#000000";
export const GREY_DARK = "#48484a";
export const GREY_LIGHT = "#8e8e93";
const [r, g, b] = [1, 3, 5].map(i => parseInt(ACCENT.slice(i, i + 2), 16));
const darker = k => `rgb(${Math.round(r * k)}, ${Math.round(g * k)}, ${Math.round(b * k)})`;  // the accent mixed with black
export const SELECT = darker(0.45);
export const HIGHLIGHT = darker(0.25);
