// The app's colours. The accent is defined ONCE here: change ACCENT and everything that uses it follows (buttons, links,
// day letters, rings, highlights, selections, the artwork). accentA gives the accent at a given opacity.
export const ACCENT = "#0a84ff";
const [r, g, b] = [1, 3, 5].map(i => parseInt(ACCENT.slice(i, i + 2), 16));
export const accentA = a => `rgba(${r},${g},${b},${a})`;

// everything else
export const NEUTRAL = { bg: "#000", card: "#1c1c1e", card2: "#2c2c2e", text: "#f5f5f7", sub: "#8e8e93", line: "#38383a" };
export const ON_ACCENT = "#fff";               // text on an accent-coloured button or circle
export const TAMIL_DIM = "#c7c7cc";            // the Tamil line under the English one
export const DISABLED = "#3a3a3c";             // days outside the plan
export const SELECTED_DAY = "rgba(255,255,255,.16)";
export const PLACEHOLDER = "#5a5a5e";          // search bar hint, darker than the usual grey so it is subtler
