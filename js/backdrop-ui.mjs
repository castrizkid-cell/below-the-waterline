// Wires the fixed backdrop: draws the armour pattern, tints it by section, drifts it with scroll.
import { armourSvg, activeSection, drift, lightAt } from "./backdrop.mjs";
import { reducedMotion } from "./dom.mjs";

export function mount({ doc = globalThis.document, env = globalThis, raf = f => env.requestAnimationFrame(f) } = {}) {
  const bd = doc.getElementById("backdrop"); if (!bd) return null;
  const root = doc.documentElement, RM = reducedMotion(env);
  const layer = bd.querySelector(".bd-scutes"); if (layer) layer.innerHTML = armourSvg();
  const secs = [...doc.querySelectorAll("#surface, section.sect, #hunt")];
  const accOf = el => (env.getComputedStyle ? env.getComputedStyle(el).getPropertyValue("--acc").trim() : "") || "#e2a83c";
  let queued = false, last = -1;
  function update() {
    queued = false;
    const y = env.scrollY || 0, vh = env.innerHeight || 800;
    const k = activeSection(secs.map(s => s.getBoundingClientRect().top), vh);
    if (k !== last) { last = k; root.style.setProperty("--bd-acc", accOf(secs[k])); }
    if (!RM) root.style.setProperty("--bd-y", `${drift(y).toFixed(1)}px`);
    root.style.setProperty("--bd-light", lightAt(y, (doc.body && doc.body.scrollHeight) || 1).toFixed(3));
  }
  const onScroll = () => { if (!queued) { queued = true; raf(update); } };
  env.addEventListener && env.addEventListener("scroll", onScroll, { passive: true });
  update();
  return { update, get active() { return last; } };
}
