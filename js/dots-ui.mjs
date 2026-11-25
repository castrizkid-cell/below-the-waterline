// Canvas wiring for the Numbers dot field (killed vs alive toggle).
import { fitCanvas, visible, reducedMotion, loop, COLORS } from "./dom.mjs";
import { mulberry32 } from "./rng.mjs";
import { N, TEXT, makeRank, layout, dotXY, elapsed, dotOps } from "./dots.mjs";

export function mount({
  doc = globalThis.document,
  env = globalThis,
  now = () => performance.now(),
  raf = f => requestAnimationFrame(f),
  rng = mulberry32(3000),
} = {}) {
  const RM = reducedMotion(env);
  const cv = doc.getElementById("dots-c"), wrap = cv.parentElement;
  const btns = [...doc.querySelectorAll("#numbers .toggle .btn")];
  const fig = doc.getElementById("fig-n"), cap = doc.getElementById("fig-cap");
  const rank = makeRank(N, rng);
  let mode = "killed", t0 = now(), born = false;
  btns.forEach(b => b.addEventListener("click", () => {
    if (mode === b.dataset.v) return; mode = b.dataset.v; t0 = now();
    btns.forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    fig.textContent = TEXT[mode][0]; cap.textContent = TEXT[mode][1]; fig.classList.toggle("amber", mode === "alive");
  }));
  cap.textContent = TEXT.killed[1];
  const stop = loop((dt, t) => {
    if (!visible(wrap, 0, env)) return;
    if (!born) { born = true; t0 = t; }
    const { ctx, w, h } = fitCanvas(cv, env);
    ctx.clearRect(0, 0, w, h);
    const L = layout(w, h), k = elapsed(t, t0, RM);
    for (let i = 0; i < N; i++) {
      const [x, y] = dotXY(i, L);
      for (const op of dotOps(mode, i, k, rank[i], COLORS)) {
        ctx.globalAlpha = op.alpha;
        ctx.beginPath(); ctx.arc(x, y, L.r * op.scale, 0, Math.PI * 2);
        if (op.kind === "fill") { ctx.fillStyle = op.color; ctx.fill(); }
        else { ctx.strokeStyle = op.color; ctx.lineWidth = 1; ctx.stroke(); }
      }
    }
    ctx.globalAlpha = 1;
  }, { now, raf });
  return { stop, get mode() { return mode; }, rank };
}
