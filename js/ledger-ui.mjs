// The ledger dot field: canvas wiring. Layout and text live in ledger.mjs.
import { layout, dotStyle, blockAt, blockLabel, tween, progress, TEXT, MODES, KILLED, ALIVE_HIGH, COLORS } from "./ledger.mjs";
import { fitCanvas, visible, reducedMotion, loop } from "./dom.mjs";
import { ease } from "./math.mjs";

export function mount({ doc = globalThis.document, env = globalThis, now = () => env.performance.now(), raf = f => env.requestAnimationFrame(f) } = {}) {
  const cv = doc.getElementById("lg-c"); if (!cv) return null;
  const big = doc.getElementById("lg-big"), cap = doc.getElementById("lg-cap"), hover = doc.getElementById("lg-hover");
  const btns = [...doc.querySelectorAll("#lg-modes button")];
  const RM = reducedMotion(env);
  let mode = "killed", from = null, to = null, t0 = now(), hoverBlock = null, size = "";
  const pos = { killed: Array(KILLED).fill([0, 0]), alive: Array(ALIVE_HIGH).fill([0, 0]) };
  const alpha = { killed: Array(KILLED).fill(1), alive: Array(ALIVE_HIGH).fill(0) };

  function setMode(m) {
    if (!MODES.includes(m)) return;
    mode = m; from = { killed: pos.killed.slice(), alive: pos.alive.slice(), ak: alpha.killed.slice(), aa: alpha.alive.slice() }; t0 = now(); to = null; hoverBlock = null;
    btns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
    if (big) { big.textContent = TEXT[m].big; big.dataset.mode = m; }
    if (cap) cap.textContent = TEXT[m].cap;
    if (hover) hover.textContent = "Point at the dots to read them in blocks of 100.";
  }
  btns.forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));

  cv.addEventListener("pointermove", ev => {
    if (!to) return;
    const r = cv.getBoundingClientRect(), x = ev.clientX - (r.left || 0), y = ev.clientY - (r.top || 0);
    const field = mode === "alive" ? { pts: to.alive, cols: 25, kind: "alive" } : mode === "compare" && x > to.split ? { pts: to.alive, cols: 20, kind: "alive" } : { pts: to.killed, cols: mode === "compare" ? 60 : 75, kind: "killed" };
    const b = blockAt(field.pts, x, y, to.pitch, field.cols);
    hoverBlock = b ? { kind: field.kind, members: new Set(b.members) } : null;
    if (hover) hover.textContent = b ? `${blockLabel(b.members.length)}${field.kind === "killed" ? ", killed" : ", alive today"}.` : "Point at the dots to read them in blocks of 100.";
  });
  cv.addEventListener("pointerleave", () => { hoverBlock = null; });

  setMode("killed");
  return loop(() => {
    if (!visible(cv, 200, env)) return;
    const { ctx, w, h } = fitCanvas(cv, env);
    const key = `${Math.round(w)}x${Math.round(h)}:${mode}`;
    if (key !== size || !to) { size = key; to = layout(mode, w, h); if (!from) from = { killed: to.killed, alive: to.alive, ak: alpha.killed, aa: alpha.alive }; }
    const k = RM ? 1 : ease(progress(now() - t0));
    ctx.clearRect(0, 0, w, h);
    if (mode === "compare") {
      ctx.strokeStyle = "rgba(232,224,204,.18)"; ctx.setLineDash([2, 5]); ctx.beginPath(); ctx.moveTo(to.split, 8); ctx.lineTo(to.split, h - 8); ctx.stroke(); ctx.setLineDash([]);
    }
    for (const kind of ["killed", "alive"]) {
      const n = kind === "killed" ? KILLED : ALIVE_HIGH;
      for (let i = 0; i < n; i++) {
        const st = dotStyle(kind, i, mode), a0 = (kind === "killed" ? from.ak : from.aa)[i] ?? 0;
        const a = a0 + ((st.a || 0) - a0) * k;
        pos[kind][i] = tween(from[kind][i] || to[kind][i], to[kind][i], k);
        (kind === "killed" ? alpha.killed : alpha.alive)[i] = a;
        if (a < .01) continue;
        const [x, y] = pos[kind][i], hot = hoverBlock && hoverBlock.kind === kind && hoverBlock.members.has(i);
        ctx.globalAlpha = a * (hoverBlock && !hot ? .45 : 1);
        ctx.beginPath(); ctx.arc(x, y, to.r * (hot ? 1.25 : 1), 0, Math.PI * 2);
        if (st.fill) { ctx.fillStyle = hot ? "#f3e7c8" : st.fill; ctx.fill(); }
        else { ctx.strokeStyle = hot ? "#f3e7c8" : COLORS.maybe; ctx.lineWidth = Math.max(1, to.r * .45); ctx.stroke(); }
      }
    }
    ctx.globalAlpha = 1;
  }, { now, raf });
}
