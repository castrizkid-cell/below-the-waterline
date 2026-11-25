// Hero canvas wiring. Nothing runs at import; call mount().
import { mulberry32 } from "./rng.mjs";
import { fitCanvas, sectionProgress, visible, reducedMotion, loop } from "./dom.mjs";
import { drawCrocSide, Ripples } from "./croc-side.mjs";
import { makeMotes, makeReeds, heroLayout, copyOpacity, blinkStep, tape } from "./hero.mjs";
import { lerp } from "./math.mjs";

export function mount(deps = {}) {
  const env = deps.env || globalThis, doc = deps.doc || env.document;
  const now = deps.now || (() => env.performance.now());
  const raf = deps.raf || (f => env.requestAnimationFrame(f));
  const rng = deps.rng || mulberry32(0x5eed01);
  const RM = reducedMotion(env);

  const sec = doc.getElementById("surface"), cv = doc.getElementById("hero-c");
  const under = doc.getElementById("hero-under"), cue = doc.getElementById("cue"), h1 = doc.getElementById("hero-h");
  if (!sec || !cv) return () => {};
  const lede = h1.parentElement.querySelector(".lede");
  const rip = new Ripples();
  const motes = makeMotes(rng), reeds = makeReeds(rng);
  let T = 0, nextRip = 0, blinkAt = 3, pointer = null;
  cv.parentElement.addEventListener("pointermove", e => { const r = cv.getBoundingClientRect(); pointer = { x: e.clientX - r.left, y: e.clientY - r.top, t: T }; }, { passive: true });

  return loop(dt => {
    if (!visible(sec, 0, env)) return;
    T += RM ? 0 : dt;
    const { ctx, w, h } = fitCanvas(cv, env);
    const p = sectionProgress(sec, env);
    const lay = heroLayout(p, w, h, T), { pe, wy, L, sx, crocTop } = lay;

    // sky
    let g = ctx.createLinearGradient(0, 0, 0, wy);
    g.addColorStop(0, "#070d0b"); g.addColorStop(.7, "#121a14"); g.addColorStop(1, "#2a2a1b");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, wy);
    // low sun glow on horizon
    const sg = ctx.createRadialGradient(w * .78, wy, 0, w * .78, wy, w * .55);
    sg.addColorStop(0, "rgba(226,168,60,.22)"); sg.addColorStop(1, "rgba(226,168,60,0)");
    ctx.fillStyle = sg; ctx.fillRect(0, 0, w, wy);
    // far bank reeds
    ctx.fillStyle = "#0a100d";
    ctx.beginPath(); ctx.moveTo(0, wy);
    for (const r of reeds) { const x = r.x * w, hh = r.h * Math.min(70, h * .08); ctx.lineTo(x - 1.2, wy - 3); ctx.lineTo(x + r.b * 10 + Math.sin(T * .7 + r.x * 20) * 1.5, wy - hh); ctx.lineTo(x + 1.2, wy - 3); }
    ctx.lineTo(w, wy); ctx.closePath(); ctx.fill();
    ctx.fillRect(0, wy - 4, w, 4);

    // underwater
    g = ctx.createLinearGradient(0, wy, 0, h);
    g.addColorStop(0, "#1c2a20"); g.addColorStop(.25, "#0f1a15"); g.addColorStop(1, "#050a08");
    ctx.fillStyle = g; ctx.fillRect(0, wy, w, h - wy);
    // light shafts
    if (h - wy > 20) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 7; i++) {
        const x0 = ((i * .17 + Math.sin(T * .15 + i) * .03) % 1) * w * 1.2 - w * .1, ww = w * (.03 + (i % 3) * .015);
        const lg = ctx.createLinearGradient(0, wy, 0, wy + (h - wy) * .9);
        lg.addColorStop(0, `rgba(170,190,140,${.05 + .03 * Math.sin(T * .6 + i * 1.7)})`); lg.addColorStop(1, "rgba(170,190,140,0)");
        ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(x0, wy); ctx.lineTo(x0 + ww, wy); ctx.lineTo(x0 + ww + w * .12, h); ctx.lineTo(x0 + w * .1, h); ctx.fill();
      }
      ctx.restore();
    }
    // crocodile, under water (dimmed by turbidity, clearer as we descend)
    ctx.save();
    ctx.beginPath(); ctx.rect(0, wy, w, h - wy); ctx.clip();
    drawCrocSide(ctx, { L, x: sx, y: crocTop, t: T, sway: .6, paddle: .4, alpha: lerp(.32, .95, pe), fill: "#1a271f", belly: "#24301f", crest: "#1a271f", leg: "#111c16" });
    // turbidity veil
    const vg = ctx.createLinearGradient(0, wy, 0, h);
    vg.addColorStop(0, `rgba(14,22,17,${lerp(.35, .05, pe)})`); vg.addColorStop(1, `rgba(5,10,8,${lerp(.85, .35, pe)})`);
    ctx.fillStyle = vg; ctx.fillRect(0, wy, w, h - wy);
    ctx.restore();
    // silt motes
    ctx.fillStyle = "rgba(200,205,170,.35)";
    for (const m of motes) { const y = wy + ((m.y + T * .006 * m.z) % 1) * (h - wy), x = (m.x + Math.sin(T * .2 + m.s) * .01) * w; if (y > wy + 4) { ctx.globalAlpha = m.z * .6; ctx.fillRect(x, y, m.z * 1.6, m.z * 1.6); } }
    ctx.globalAlpha = 1;

    // above water: only what breaks the surface
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, wy); ctx.clip();
    const b = blinkStep(T, blinkAt, rng); blinkAt = b.blinkAt;
    const r = drawCrocSide(ctx, { L, x: sx, y: crocTop, t: T, sway: 0, alpha: 1, fill: "#202a1f", crest: "#202a1f", legs: false, eyeGlow: 1, blink: RM ? 0 : b.blink });
    ctx.restore();
    // surface line, meniscus and reflections
    ctx.fillStyle = "rgba(232,224,204,.08)"; ctx.fillRect(0, wy, w, 1);
    ctx.save(); ctx.globalAlpha = .55;
    for (let i = 0; i < 26; i++) {
      const y = wy + 2 + i * 2.2, a = (1 - i / 26) * .32;
      const x = (Math.sin(i * 12.3 + T * .4) * .5 + .5) * w, len = 20 + (i * 37 % 90);
      ctx.fillStyle = `rgba(226,168,60,${a * .5})`; ctx.fillRect(x, y, len, 1);
      ctx.fillStyle = `rgba(232,224,204,${a * .25})`; ctx.fillRect((x * 1.7) % w, y, len * .6, 1);
    }
    // eye reflection
    if (r.eye) { ctx.fillStyle = "rgba(226,168,60,.35)"; const ex = r.eye[0], ey = wy + (wy - r.eye[1]) * .9; ctx.fillRect(ex - L * .008 + Math.sin(T * 3) * 1.5, ey, L * .01, 1.5); ctx.fillRect(ex - L * .006 + Math.sin(T * 3.3) * 2, ey + 4, L * .008, 1); }
    ctx.restore();
    // ripples on the surface
    if (!RM && T > nextRip) { rip.add(r.eye ? r.eye[0] : sx, wy, L * .09, 4); nextRip = T + 2.8; }
    if (pointer && T - pointer.t < .05 && Math.abs(pointer.y - wy) < 60 && rng() < .25) rip.add(pointer.x, wy, 90, 2.4);
    rip.step(RM ? 0 : dt).draw(ctx, .08);

    // overlay copy states
    const op = copyOpacity(p);
    h1.style.opacity = String(op.h1);
    lede.style.opacity = String(op.lede);
    under.style.opacity = String(op.under);
    cue.style.opacity = String(op.cue);

    // measuring tape under the body, once below
    const tp = tape(p, { sx, L, w, crocTop });
    if (tp) {
      const { mt, y, x0, x1 } = tp;
      ctx.strokeStyle = `rgba(226,168,60,${mt})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.fillStyle = `rgba(226,168,60,${mt})`; ctx.font = "500 11px 'IBM Plex Mono', monospace";
      for (const { m, x, big } of tp.ticks) { ctx.fillRect(x, y - (big ? 6 : 3), 1, big ? 12 : 6); if (big) ctx.fillText(m + " m", x + 4, y + 16); }
    }
  }, { now, raf });
}
