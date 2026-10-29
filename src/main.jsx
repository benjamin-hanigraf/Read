import { Component, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { loadBible } from "./data/bible.js";
import { ACCENT, NEUTRAL } from "./theme.js";

const reload = <button onClick={() => location.reload()} style={{ display: "block", margin: "16px auto 0", background: "none", border: "none", color: ACCENT, font: "600 16px -apple-system, sans-serif", cursor: "pointer" }}>Reload</button>;

// a render error would otherwise leave a blank black screen
class Boundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e) { console.error(e); }
  render() {
    return this.state.failed
      ? <div style={{ color: NEUTRAL.sub, font: "15px -apple-system, sans-serif", textAlign: "center", paddingTop: "40vh" }}>Something went wrong.{reload}</div>
      : this.props.children;
  }
}

// iOS Safari ignores user-scalable=no, so also stop its pinch gestures
for (const t of ["gesturestart", "gesturechange", "gestureend"]) document.addEventListener(t, e => e.preventDefault());

// Some iOS versions report a layout viewport shorter than the screen (47px short on an iPhone 13). Everything anchored to the
// bottom then floats above the real bottom. Measure the shortfall into --gap; the layout adds it back (see GAP/VH in App.jsx).
// While the phone is turning, iOS reports the OLD size for a moment: those readings are ignored (they are what once pushed the
// bottom bar half off the screen), and the measurement is repeated until the new size has settled.
const syncGap = () => {
  const root = document.documentElement, portrait = matchMedia("(orientation: portrait)").matches;
  if (!portrait) { root.style.setProperty("--gap", "0px"); return; }  // sideways: the layout is exact
  if (innerHeight < innerWidth) return;  // still the old (sideways) size: wait for the next reading
  const standalone = navigator.standalone || matchMedia("(display-mode: standalone)").matches;
  const seen = Math.max(innerHeight, window.visualViewport ? window.visualViewport.height : 0), g = standalone ? Math.max(screen.width, screen.height) - seen : 0;
  root.style.setProperty("--gap", (g > 8 && g < 80 ? Math.round(g) : 0) + "px");
};
let settle = [];
const turned = () => {
  syncGap(); settle.forEach(clearTimeout);
  settle = [60, 200, 500, 1000, 1800].map(ms => setTimeout(() => { syncGap(); window.scrollTo(0, 0); }, ms));
};
syncGap();
for (const t of ["resize", "orientationchange"]) window.addEventListener(t, turned);
for (const t of ["pageshow", "focus"]) window.addEventListener(t, syncGap);
document.addEventListener("visibilitychange", syncGap);

loadBible();
createRoot(document.getElementById("root")).render(<StrictMode><Boundary><App /></Boundary></StrictMode>);
