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

loadBible();
createRoot(document.getElementById("root")).render(<StrictMode><Boundary><App /></Boundary></StrictMode>);
