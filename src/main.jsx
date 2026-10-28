import { Component, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { loadBible } from "./data/bible.js";

const root = createRoot(document.getElementById("root"));
const note = { color: "#8e8e93", font: "15px -apple-system, sans-serif", textAlign: "center", paddingTop: "40vh" };
const reload = <button onClick={() => location.reload()} style={{ display: "block", margin: "16px auto 0", background: "none", border: "none", color: "#0a84ff", font: "600 16px -apple-system, sans-serif", cursor: "pointer" }}>Reload</button>;
const Failed = ({ msg }) => <div style={note}>{msg}{reload}</div>;
const splash = msg => root.render(<div style={note}>{msg}</div>);

// a render error would otherwise leave a blank black screen
class Boundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e) { console.error(e); }
  render() { return this.state.failed ? <Failed msg="Something went wrong." /> : this.props.children; }
}

splash("Loading…");
loadBible()
  .then(() => import("./App.jsx"))
  .then(({ default: App }) => root.render(<StrictMode><Boundary><App /></Boundary></StrictMode>))
  .catch(e => { console.error(e); root.render(<Failed msg="Couldn't load the Bible. Check your connection and reload." />); });
