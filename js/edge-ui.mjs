// The Edge reaction test wiring. Nothing runs at import; call mount().
import { mulberry32 } from "./rng.mjs";
import { fitCanvas, visible, loop } from "./dom.mjs";
import { drawCrocSide, Ripples } from "./croc-side.mjs";
import { initialState, step, pose, wantsSpace } from "./edge.mjs";

export function mount(deps = {}) {
  const env = deps.env || globalThis, doc = deps.doc || env.document;
  const now = deps.now || (() => env.performance.now());
  const raf = deps.raf || (f => env.requestAnimationFrame(f));
  const rng = deps.rng || mulberry32(0x5eed02);

  const box = doc.getElementById("edge-box"), cv = doc.getElementById("edge-c");
  if (!box || !cv) return () => {};
  const big = doc.getElementById("edge-big"), small = doc.getElementById("edge-small");
  const bestEl = doc.getElementById("best"), lastEl = doc.getElementById("last"), caughtEl = doc.getElementById("caught");
  let S = initialState(), T = 0;
  const rip = new Ripples();

  // Write only what changed, so the page's initial text stays until the state touches it.
  function apply(next) {
    const prev = S; S = next;
    if (next.best !== prev.best) bestEl.textContent = next.best + " ms";
    if (next.lastText !== prev.lastText) lastEl.textContent = next.lastText;
    if (next.caught !== prev.caught) caughtEl.textContent = next.caught;
    if (next.big !== prev.big || next.small !== prev.small) { big.textContent = next.big; small.textContent = next.small; }
  }
  const press = () => apply(step(S, { type: "press" }, now(), rng));

  box.addEventListener("pointerdown", e => { e.preventDefault(); press(); });
  box.addEventListener("keydown", e => { if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); press(); } });
  env.addEventListener("keydown", e => { if (e.code === "Space" && wantsSpace(S.phase) && doc.activeElement !== box && visible(box, 0, env)) { e.preventDefault(); press(); } });

  return loop((dt, t) => {
    if (!visible(box, 0, env)) return;
    T += dt;
    apply(step(S, { type: "tick" }, t, rng));
    const { ctx, w, h } = fitCanvas(cv, env);
    const { WY, L, x, y, jaw, tilt, eye } = pose(S, t, w, h, T);
    let g = ctx.createLinearGradient(0, 0, 0, WY); g.addColorStop(0, "#060c0a"); g.addColorStop(1, "#262719"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, WY);
    g = ctx.createLinearGradient(0, WY, 0, h); g.addColorStop(0, "#1a261c"); g.addColorStop(1, "#050a08"); ctx.fillStyle = g; ctx.fillRect(0, WY, w, h - WY);
    // your muzzle, at the right edge
    ctx.fillStyle = "#12140e"; ctx.beginPath(); ctx.moveTo(w, WY - h * .32); ctx.quadraticCurveTo(w * .86, WY - h * .2, w * .78, WY - 2); ctx.lineTo(w * .8, WY + 2); ctx.quadraticCurveTo(w * .9, WY - h * .08, w, WY - h * .1); ctx.fill();
    if (S.phase === "strike" && rng() < .5) rip.add(x + L * .1, WY, 120, 1.4);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, WY); ctx.clip();
    drawCrocSide(ctx, { L, x, y, t: T, sway: 0, legs: false, jaw, tilt, eyeGlow: eye, fill: "#1f2a1f" });
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(0, WY, w, h - WY); ctx.clip();
    drawCrocSide(ctx, { L, x, y, t: T, sway: .4, jaw, tilt, alpha: .35, fill: "#16211a" });
    ctx.restore();
    ctx.fillStyle = "rgba(232,224,204,.15)"; ctx.fillRect(0, WY, w, 1);
    if (S.phase === "watch" && rng() < dt * .6) rip.add(x + L * .145, WY, 50, 2.5);
    rip.step(dt).draw(ctx, .1);
  }, { now, raf });
}
