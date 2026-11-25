// DOM wiring for the nest temperature slider and clutch of eggs.
import { eggThresholds, nestState } from "./nest.mjs";

export function mount(deps = {}) {
  const doc = deps.doc || globalThis.document;
  const input = doc.getElementById("temp"), read = doc.getElementById("t-read"), out = doc.getElementById("t-out"), clutch = doc.getElementById("clutch");
  if (!input || !read || !out || !clutch) return null;
  const thresholds = eggThresholds();
  const eggs = thresholds.map(() => { const e = doc.createElement("div"); e.className = "egg"; clutch.appendChild(e); return e; });
  function update() {
    const st = nestState(+input.value, thresholds);
    read.textContent = st.read;
    out.textContent = st.out;
    eggs.forEach((e, i) => { const male = st.males[i]; e.classList.toggle("m", male); e.classList.toggle("f", !male); });
  }
  input.addEventListener("input", update); update();
  return { update, eggs };
}
