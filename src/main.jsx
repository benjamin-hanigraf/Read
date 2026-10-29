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
const syncGap = () => {
  const standalone = navigator.standalone || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
  const seen = Math.max(innerHeight, window.visualViewport ? window.visualViewport.height : 0), g = standalone && innerHeight >= innerWidth ? Math.max(screen.width, screen.height) - seen : 0;
  document.documentElement.style.setProperty("--gap", (g > 8 && g < 80 ? Math.round(g) : 0) + "px");
};
syncGap();
for (const t of ["resize", "orientationchange", "pageshow", "focus"]) window.addEventListener(t, syncGap);
document.addEventListener("visibilitychange", syncGap);

loadBible();
createRoot(document.getElementById("root")).render(<StrictMode><Boundary><App /></Boundary></StrictMode>);
