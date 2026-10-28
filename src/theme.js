// The app's accent colour, defined once. Change ACCENT and everything that uses it follows: buttons, links, progress
// rings, highlights, selections, day letters, the daily artwork. (accentA gives the same colour at a given opacity.)
export const ACCENT = "#0a84ff";
const [r, g, b] = [1, 3, 5].map(i => parseInt(ACCENT.slice(i, i + 2), 16));
export const accentA = a => `rgba(${r},${g},${b},${a})`;
