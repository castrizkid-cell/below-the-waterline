// Grow section wiring: slider, readout, diet/predator lists, to-scale canvas. Nothing runs at import; call mount().
import { fitCanvas, visible, reducedMotion, loop } from "./dom.mjs";
import { drawCrocSide } from "./croc-side.mjs";
import { readout, inRange, parseRange, approach, growLayout, crocOpts, drawPerson } from "./grow.mjs";

export function mount(deps = {}) {
  const env = deps.env || globalThis, doc = deps.doc || env.document;
  const now = deps.now || (() => env.performance.now());
  const raf = deps.raf || (f => env.requestAnimationFrame(f));
  const RM = reducedMotion(env);

  const input = doc.getElementById("len"), cv = doc.getElementById("grow-c");
  if (!input || !cv) return () => {};
  const lenEl = doc.getElementById("g-len"), kgEl = doc.getElementById("g-kg"), stEl = doc.getElementById("g-stage");
  const lis = [...doc.querySelectorAll("#g-eat li, #g-pred li")].map(li => ({ li, ...parseRange(li.dataset) }));
  let shown = 4.5, target = 4.5, T = 0;
  function update() {
    target = +input.value;
    const r = readout(target);
    lenEl.textContent = r.len; kgEl.textContent = r.kg; stEl.textContent = r.stage;
    input.style.setProperty("--pct", r.pct);
    lis.forEach(({ li, min, max }) => li.classList.toggle("gray", !inRange(target, min, max)));
  }
  input.addEventListener("input", update); update();

  return loop(dt => {
    if (!visible(cv, 0, env)) return;
    T += RM ? 0 : dt;
    shown = approach(shown, target, dt, RM);
    const { ctx, w, h } = fitCanvas(cv, env);
    ctx.clearRect(0, 0, w, h);
    const { ppm, base, x0 } = growLayout(w, h);
    // metre grid
    ctx.font = "500 11px 'IBM Plex Mono', monospace"; ctx.fillStyle = "rgba(143,156,118,.75)";
    for (let m = 0; m <= 6; m++) { const x = x0 + m * ppm; ctx.fillStyle = "rgba(232,224,204,.07)"; ctx.fillRect(x, 0, 1, h); ctx.fillStyle = "rgba(143,156,118,.75)"; ctx.fillText(m + " m", x + 4, 14); }
    drawPerson(ctx, x0 + 6.3 * ppm, base, ppm);
    drawCrocSide(ctx, crocOpts(shown * ppm, x0, base, T));
  }, { now, raf });
}
