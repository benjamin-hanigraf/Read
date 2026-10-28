import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { loadBible } from "./data/bible.js";

const root = createRoot(document.getElementById("root"));
const splash = msg => root.render(<div style={{ color: "#8e8e93", font: "15px -apple-system, sans-serif", textAlign: "center", paddingTop: "40vh" }}>{msg}</div>);

splash("Loading…");
loadBible()
  .then(() => import("./App.jsx"))
  .then(({ default: App }) => root.render(<StrictMode><App /></StrictMode>))
  .catch(e => splash("Couldn't load the Bible. Check your connection and reload."));
