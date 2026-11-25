// DOM wiring for the breath clock HUD.
import { MAX, hudState, toggleExpanded } from "./hud.mjs";

export function mount(deps = {}) {
  const doc = deps.doc || globalThis.document;
  const now = deps.now || (() => Date.now());
  const every = deps.setInterval || ((f, ms) => globalThis.setInterval(f, ms));
  const clear = deps.clearInterval || (id => globalThis.clearInterval(id));
  const max = deps.max ?? MAX;
  const hud = doc.getElementById("hud"), t = doc.getElementById("hud-t"), a = doc.getElementById("hud-a"), bar = doc.getElementById("hud-bar");
  if (!hud || !t || !a || !bar) return null;
  const start = now();
  hud.addEventListener("click", () => hud.setAttribute("aria-expanded", toggleExpanded(hud.getAttribute("aria-expanded"))));
  const tick = () => { const st = hudState(now() - start, max); t.textContent = st.time; a.textContent = st.air; bar.style.transform = st.transform; };
  tick();
  const id = every(tick, 1000);
  return { tick, stop: () => clear(id) };
}
