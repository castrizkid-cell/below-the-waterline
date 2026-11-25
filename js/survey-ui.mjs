// "Count the eyes" night spotlight survey. Nothing runs at import; call mount().
import { fitCanvas, visible, reducedMotion, loop } from "./dom.mjs";
import { mulberry32 } from "./rng.mjs";
import { hash01 } from "./math.mjs";
import { makeSurvey, moveBeam, countAt, countNearest, reveal as revealState, summary, surfacedAt, diveAge, inBeam, beamStrength, eyeLayout } from "./survey.mjs";

const EYE = "#ff7a2e", OK = "#8fb36a", MISS = "#c8643c";
const HINT = "Move the light across the water. Click or tap a pair of eyes to count it (or press Enter).";

export function mount(deps = {}) {
  const env = deps.env || globalThis, doc = deps.doc || env.document;
  const now = deps.now || (() => env.performance.now());
  const raf = deps.raf || (f => env.requestAnimationFrame(f));
  const cv = doc.getElementById("sv-c");
  if (!cv) return null;
  const RM = reducedMotion(env);
  const countEl = doc.getElementById("sv-count"), totalEl = doc.getElementById("sv-total"), msgEl = doc.getElementById("sv-msg");
  const revealBtn = doc.getElementById("sv-reveal"), resetBtn = doc.getElementById("sv-reset");
  const deco = deps.rng || mulberry32(99);
  const ripples = Array.from({ length: 26 }, () => ({ x: deco(), y: 0.2 + 0.78 * deco(), len: 0.04 + 0.1 * deco(), sp: 0.2 + 0.6 * deco() }));

  let seed = deps.seed ?? 7, state, T = 0, W = 1000, H = 437;
  const setText = (n, s) => { if (n) n.textContent = s; };
  function start(s) {
    seed = s; state = makeSurvey(seed, 48, { aspect: H / W });
    setText(countEl, "0"); setText(totalEl, "?"); setText(msgEl, HINT);
  }
  start(seed);

  const toNorm = ev => { const r = cv.getBoundingClientRect(); return { x: (ev.clientX - (r.left || 0)) / (r.width || 1), y: (ev.clientY - (r.top || 0)) / (r.height || 1) }; };
  const afterCount = prev => { if (state !== prev) setText(countEl, String(state.counted.length)); };
  cv.addEventListener("pointermove", ev => { const p = toNorm(ev); state = moveBeam(state, p.x, p.y); });
  cv.addEventListener("pointerdown", ev => { const p = toNorm(ev); state = moveBeam(state, p.x, p.y); });
  cv.addEventListener("click", ev => { const p = toNorm(ev); state = moveBeam(state, p.x, p.y); const moved = state; state = countAt(state, p, T); afterCount(moved); });
  if (cv.getAttribute && !cv.getAttribute("tabindex")) cv.setAttribute("tabindex", "0");
  if (cv.getAttribute && !cv.getAttribute("aria-label")) cv.setAttribute("aria-label", "Night river. Move the spotlight with the pointer or arrow keys; press Enter to count the nearest eyes.");
  cv.addEventListener("keydown", ev => {
    const step = 0.025, k = ev.key, b = state.beam;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step * 2], ArrowDown: [0, step * 2] }[k];
    if (d) { ev.preventDefault(); state = moveBeam(state, b.x + d[0], b.y + d[1]); }
    else if (k === "Enter" || k === " ") { ev.preventDefault(); const prev = state; state = countNearest(state, T); afterCount(prev); }
  });

  function reveal() {
    state = revealState(state);
    const s = summary(state);
    setText(totalEl, String(s.total)); setText(msgEl, s.message);
    return s;
  }
  const reset = () => start(seed + 1);
  if (revealBtn) revealBtn.addEventListener("click", reveal);
  if (resetBtn) resetBtn.addEventListener("click", reset);

  function draw(ctx, w, h) {
    // water
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#050d0c"); g.addColorStop(1, "#0b1c1a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // moon reflection: a dim broken streak
    const mx = w * 0.78;
    for (let i = 0; i < 14; i++) {
      const y = h * (0.2 + i * 0.055), wob = RM ? 0 : Math.sin(T * 0.8 + i * 1.7) * 4;
      ctx.fillStyle = `rgba(200,210,190,${0.05 - i * 0.0025})`;
      ctx.fillRect(mx - (10 + i * 2) / 2 + wob, y, 10 + i * 2, 1.5);
    }
    // far bank silhouette
    ctx.fillStyle = "#020605"; ctx.beginPath(); ctx.moveTo(0, 0);
    for (let i = 0; i <= 40; i++) ctx.lineTo((i / 40) * w, h * (0.1 + 0.06 * hash01(i) + 0.03 * hash01(i * 3.1)));
    ctx.lineTo(w, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(143,156,118,.06)"; ctx.fillRect(0, h * 0.17, w, 1);
    // ripples
    ctx.strokeStyle = "rgba(180,200,190,.07)"; ctx.lineWidth = 1;
    for (const r of ripples) {
      const drift = RM ? 0 : (T * r.sp * 0.01) % 1, x = ((r.x + drift) % 1) * w, y = r.y * h;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + r.len * w * 0.5, y - 1.5, x + r.len * w, y); ctx.stroke();
    }
    // spotlight pool
    const b = state.beam, bx = b.x * w, by = b.y * h, br = b.r * w;
    const pool = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    pool.addColorStop(0, "rgba(255,220,160,.34)"); pool.addColorStop(0.55, "rgba(255,196,124,.14)"); pool.addColorStop(1, "rgba(255,180,110,0)");
    ctx.fillStyle = pool; ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();

    const counted = new Map(state.counted.map((id, i) => [id, i + 1]));
    if (state.revealed) for (const c of state.crocs) drawSilhouette(ctx, c, w, h, counted.has(c.id));
    for (const c of state.crocs) {
      const x = c.x * w, y = c.y * h, L = eyeLayout(c, w), lit = inBeam(c, b, state.aspect);
      if (surfacedAt(c, T)) {
        if (lit) drawEyes(ctx, x, y, L, 0.35 + 0.65 * beamStrength(c, b, state.aspect));
      } else if (lit && !RM) {
        const age = diveAge(c, T);
        if (age < 1.2) { ctx.strokeStyle = `rgba(200,220,210,${0.18 * (1 - age / 1.2)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, 3 + age * 10, (3 + age * 10) * 0.35, 0, 0, Math.PI * 2); ctx.stroke(); }
      }
      if (counted.has(c.id)) {
        ctx.strokeStyle = OK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, L.gap + 6, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = OK; ctx.font = "500 9px 'IBM Plex Mono', monospace"; ctx.fillText(String(counted.get(c.id)), x + L.gap + 6, y - L.gap - 4);
      }
    }
  }
  function drawEyes(ctx, x, y, L, a) {
    ctx.save();
    ctx.globalAlpha = a; ctx.fillStyle = EYE; ctx.shadowColor = EYE; ctx.shadowBlur = 8 + L.gap;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(x + s * L.gap / 2, y, L.eye, 0, Math.PI * 2); ctx.fill(); }
    ctx.shadowBlur = 0; ctx.globalAlpha = a * 0.35; ctx.fillStyle = "#d9a070";
    ctx.beginPath(); ctx.arc(x + L.nostril.dx, y + L.nostril.dy, Math.max(0.8, L.eye * 0.6), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawSilhouette(ctx, c, w, h, isCounted) {
    const x = c.x * w, y = c.y * h, L = eyeLayout(c, w), len = L.body, d = c.heading, wid = len * 0.09;
    // head end sits at the eyes; body and tail trail behind
    const hx = x + d * len * 0.12, tx = x - d * len * 0.88;
    ctx.beginPath();
    ctx.moveTo(hx, y);
    ctx.quadraticCurveTo(x, y - wid, x - d * len * 0.35, y - wid * 1.3);
    ctx.quadraticCurveTo(x - d * len * 0.6, y - wid * 0.6, tx, y);
    ctx.quadraticCurveTo(x - d * len * 0.6, y + wid * 0.6, x - d * len * 0.35, y + wid * 1.3);
    ctx.quadraticCurveTo(x, y + wid, hx, y);
    ctx.closePath();
    ctx.fillStyle = "rgba(52,62,34,.75)"; ctx.fill();
    ctx.strokeStyle = isCounted ? OK : MISS; ctx.lineWidth = 1.2; ctx.stroke();
  }

  const stop = loop(dt => {
    T += dt; // dives keep happening even with reduced motion
    if (!visible(cv, 0, env)) return;
    const { ctx, w, h } = fitCanvas(cv, env);
    if (w !== W || h !== H) { W = w; H = h; state = { ...state, aspect: h / w }; }
    draw(ctx, w, h);
  }, { now, raf });

  return { reveal, reset, stop, get state() { return state; }, get time() { return T; }, get seed() { return seed; } };
}
