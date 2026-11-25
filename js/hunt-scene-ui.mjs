// Canvas renderer + scroll wiring for the Hunt scene. Geometry and choreography live in hunt-model.mjs.
import { STAGES, SCENE, pose, sideAt, mouthAt } from "./hunt-model.mjs";
import { clamp, lerp, seg, hash01 } from "./math.mjs";
import { mulberry32 } from "./rng.mjs";
import { reducedMotion } from "./dom.mjs";

let RM = false; // set by mount()
const TAU = Math.PI * 2;
// deterministic noise
const rnd = hash01;
// Path2D comes from the environment (set by mount, or passed as o.Path2D) so drawing runs against a fake canvas.
let PATH = null;
const newPath = o => new ((o && o.Path2D) || PATH || globalThis.Path2D)();
// 2D affine matrix helpers ({a,b,c,d,e,f}), so nothing depends on DOMPoint/DOMMatrix.
export const applyM = (m, x, y) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
export const invertM = m => { const det = m.a * m.d - m.b * m.c; return { a: m.d / det, b: -m.b / det, c: -m.c / det, d: m.a / det, e: (m.c * m.f - m.d * m.e) / det, f: (m.b * m.e - m.a * m.f) / det }; };

/* ================= crocodile, side view, facing right ================= */
function drawCroc(ctx, o, anchors) {
  const L = o.L, T = o.T || 0, N = 110;
  const roll = o.roll || 0, cr = Math.cos(roll), sr = Math.sin(roll);
  const sy = Math.sign(cr || 1) * Math.max(Math.abs(cr), .38);
  const mid = u => (u > .45 ? (u - .45) * (u - .45) * .07 : 0) + Math.sin(u * 7 - T * 2.2) * (o.swim || 0) * Math.pow(u, 1.7) * .03
    - (o.tailKick || 0) * Math.pow(seg(u, .45, 1), 1.5) * .09;
  const X = u => -u * L;
  const Y = (u, k) => { const p = sideAt(u); return (mid(u) + lerp(p.top, p.bot, k)) * L; };
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.translate(-.32 * L, 0); ctx.rotate(o.pitch || 0); ctx.translate(.32 * L, 0);
  ctx.scale(1, sy);
  ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
  const shade = o.shade || 0; // 0 = lit, 1 = deep in the water

  const grad = () => {
    const g = ctx.createLinearGradient(0, -.046 * L, 0, .05 * L);
    g.addColorStop(0, "#22261a"); g.addColorStop(.3, "#3a3b25"); g.addColorStop(.55, "#555132"); g.addColorStop(.74, "#7d7350"); g.addColorStop(.86, "#b3a476"); g.addColorStop(1, "#c8b88a");
    return g;
  };
  const legC = "#3a3a25", legFar = "#1c1f15";

  // ---- legs ----
  const limbs = o.limbs || 0, sw = (o.swim || 0) * .15;
  function leg(u, hind, far) {
    const ax = X(u) + (far ? .012 * L : 0), ay = Y(u, hind ? .62 : .7) - (far ? .006 * L : 0);
    const l1 = (hind ? .082 : .066) * L, l2 = (hind ? .07 : .056) * L, lf = (hind ? .05 : .038) * L;
    const wob = Math.sin(T * 3 + (hind ? 1 : 0) + (far ? 2 : 0)) * sw;
    const a1 = hind ? lerp(Math.PI - .18, Math.PI / 2 - .55, limbs) + wob : lerp(Math.PI - .28, Math.PI / 2 + .38, limbs) + wob;
    const a2 = hind ? lerp(Math.PI - .06, Math.PI / 2 + .5, limbs) : lerp(Math.PI - .1, Math.PI / 2 - .25, limbs);
    const a3 = lerp(Math.PI, hind ? .15 : .05, limbs);
    const kx = ax + Math.cos(a1) * l1, ky = ay + Math.sin(a1) * l1;
    const fx = kx + Math.cos(a2) * l2, fy = ky + Math.sin(a2) * l2;
    const w1 = (hind ? .028 : .021) * L, w2 = (hind ? .017 : .013) * L;
    const quad = (x0, y0, x1, y1, r0, r1) => {
      const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a), ny = Math.cos(a);
      ctx.beginPath(); ctx.moveTo(x0 + nx * r0, y0 + ny * r0); ctx.lineTo(x1 + nx * r1, y1 + ny * r1);
      ctx.arc(x1, y1, r1, a + Math.PI / 2, a - Math.PI / 2, true); ctx.lineTo(x0 - nx * r0, y0 - ny * r0); ctx.closePath(); ctx.fill();
    };
    ctx.fillStyle = far ? legFar : legC;
    quad(ax, ay, kx, ky, w1, w2 * 1.1); quad(kx, ky, fx, fy, w2, w2 * .75);
    // foot + toes
    const toes = hind ? 4 : 5;
    if (hind) { // webbing
      ctx.beginPath(); ctx.moveTo(fx, fy);
      for (let i = 0; i < toes; i++) { const a = a3 - .35 + i * .22; ctx.lineTo(fx + Math.cos(a) * lf, fy + Math.sin(a) * lf); }
      ctx.closePath(); ctx.globalAlpha *= .8; ctx.fill(); ctx.globalAlpha /= .8;
    }
    ctx.strokeStyle = ctx.fillStyle; ctx.lineCap = "round";
    for (let i = 0; i < toes; i++) {
      const a = a3 - .4 + i * (hind ? .24 : .2), l = lf * (hind ? 1 : .8) * (1 - Math.abs(i - (toes - 1) / 2) * .12);
      ctx.lineWidth = .0065 * L; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(a) * l, fy + Math.sin(a) * l); ctx.stroke();
      ctx.fillStyle = "#14140c"; ctx.beginPath(); ctx.arc(fx + Math.cos(a) * l, fy + Math.sin(a) * l, .003 * L, 0, TAU); ctx.fill(); ctx.fillStyle = far ? legFar : legC;
    }
  }
  leg(.47, true, true); leg(.275, false, true);

  // ---- body (u .18 → 1) ----
  const body = newPath(o);
  body.moveTo(X(.18), Y(.18, 0));
  for (let i = Math.round(.18 * N); i <= N; i++) { const u = i / N; body.lineTo(X(u), Y(u, 0)); }
  for (let i = N; i >= Math.round(.18 * N); i--) { const u = i / N; body.lineTo(X(u), Y(u, 1)); }
  body.closePath();
  ctx.fillStyle = grad(); ctx.fill(body);
  ctx.save(); ctx.clip(body);
  // tail cross-bands, flank blotches
  ctx.fillStyle = "rgba(14,16,8,.42)";
  for (let u = .5; u < .99; u += .052) { ctx.beginPath(); ctx.moveTo(X(u), Y(u, -.1)); ctx.lineTo(X(u + .02), Y(u + .02, -.1)); ctx.lineTo(X(u + .028), Y(u + .028, .72)); ctx.lineTo(X(u + .006), Y(u + .006, .65)); ctx.fill(); }
  for (let i = 0; i < 46; i++) { const u = .2 + rnd(i) * .3, k = .15 + rnd(i + 50) * .45; ctx.globalAlpha = (o.alpha == null ? 1 : o.alpha) * (.15 + rnd(i + 9) * .25); ctx.beginPath(); ctx.ellipse(X(u), Y(u, k), (.004 + rnd(i + 3) * .008) * L, (.002 + rnd(i + 4) * .004) * L, 0, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
  // scale grid
  ctx.strokeStyle = "rgba(8,10,4,.26)"; ctx.lineWidth = Math.max(.5, .0011 * L);
  for (let u = .19; u < .98; u += .0105) { ctx.beginPath(); ctx.moveTo(X(u), Y(u, .05)); ctx.lineTo(X(u), Y(u, .97)); ctx.stroke(); }
  for (const k of [.24, .4, .55, .7]) { ctx.beginPath(); for (let u = .19; u <= 1; u += .01) ctx.lineTo(X(u), Y(u, k)); ctx.stroke(); }
  ctx.strokeStyle = "rgba(255,240,200,.07)";
  for (let u = .195; u < .98; u += .0105) { ctx.beginPath(); ctx.moveTo(X(u) - .002 * L, Y(u, .74)); ctx.lineTo(X(u) - .002 * L, Y(u, .97)); ctx.stroke(); }
  // underside shadow + wet rim light
  const sh = ctx.createLinearGradient(0, .01 * L, 0, .055 * L); sh.addColorStop(0, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,.35)");
  ctx.fillStyle = sh; ctx.fillRect(X(1), 0, L, .06 * L);
  ctx.restore();
  ctx.strokeStyle = "rgba(255,226,170,.28)"; ctx.lineWidth = Math.max(.8, .0018 * L); ctx.beginPath();
  for (let u = .19; u <= .98; u += .01) ctx.lineTo(X(u), Y(u, 0) + .6); ctx.stroke();

  // osteoderms along the back, double tail crest
  for (let u = .205; u < .5; u += .019) {
    for (const [dk, col] of [[.0, "#2b2d1c"], [.07, "#3b3b26"]]) {
      ctx.fillStyle = col; const x = X(u + dk * .1), y = Y(u, dk) - .0015 * L;
      ctx.beginPath(); ctx.ellipse(x, y, .0055 * L, .0042 * L, 0, Math.PI, 0); ctx.fill();
    }
  }
  for (let u = .49; u < .975; u += .0165) {
    const h = lerp(.016, .004, seg(u, .5, .97)) * L, w = .006 * L;
    for (const [off, col] of [[.007, "#1f2216"], [0, "#34341f"]]) {
      if (u > .8 && off) continue;
      ctx.fillStyle = col; const x = X(u + off), y = Y(u + off, 0) + .5;
      ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x - w * .1, y - h); ctx.lineTo(x + w * .6, y); ctx.fill();
    }
  }

  // ---- head (u 0 → .2), hinged at the back of the jaw ----
  const hx = X(.192), hy = Y(.192, mouthAt(.192));
  const jaw = o.jaw || 0, upA = -jaw * .2, loA = jaw * .62;
  const rot = (a, f) => { ctx.save(); ctx.translate(hx, hy); ctx.rotate(a); ctx.translate(-hx, -hy); f(); ctx.restore(); };
  const hu = [], hl = [];
  for (let i = 0; i <= 40; i++) { const u = i / 40 * .2; hu.push([X(u), Y(u, 0)]); hl.push([X(u), Y(u, 1)]); }
  const ml = []; for (let i = 0; i <= 40; i++) { const u = i / 40 * .2; ml.push([X(u), Y(u, mouthAt(u))]); }
  // mouth interior
  if (jaw > .02) {
    ctx.save();
    const mg = ctx.createLinearGradient(X(0), 0, X(.2), 0); mg.addColorStop(0, "#c9a084"); mg.addColorStop(.7, "#8a5f4c"); mg.addColorStop(1, "#3a221c");
    ctx.fillStyle = mg; ctx.beginPath();
    const R = (p, a) => { const dx = p[0] - hx, dy = p[1] - hy; return [hx + dx * Math.cos(a) - dy * Math.sin(a), hy + dx * Math.sin(a) + dy * Math.cos(a)]; };
    ml.forEach(p => { const q = R(p, upA); ctx.lineTo(q[0], q[1]); });
    [...ml].reverse().forEach(p => { const q = R(p, loA); ctx.lineTo(q[0], q[1]); });
    ctx.fill();
    // palatal valve
    ctx.fillStyle = "#d7b99a"; ctx.beginPath(); ctx.ellipse(hx + .006 * L, hy, .006 * L, .012 * L * jaw + .003 * L, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  const teeth = (upper, a) => {
    for (let u = .009; u < .168; u += .0112) {
      const big = Math.exp(-Math.pow((u - (upper ? .052 : .035)) / .012, 2)) + Math.exp(-Math.pow((u - .098) / .015, 2)) * .7;
      const l = (.0075 + big * .007) * L, w = (.0032 + big * .0015) * L;
      const x = X(u + (upper ? 0 : .0056)), y = Y(u, mouthAt(u)) + (upper ? -.0015 : .0015) * L;
      const g = ctx.createLinearGradient(0, y, 0, y + (upper ? l : -l)); g.addColorStop(0, "#b9ac87"); g.addColorStop(1, "#efe6cc");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w * .2, y + (upper ? l * .7 : -l * .7), x + w * .15, y + (upper ? l : -l)); ctx.quadraticCurveTo(x + w * .5, y + (upper ? l * .5 : -l * .5), x + w, y); ctx.fill();
    }
  };
  // lower jaw
  rot(loA, () => {
    ctx.fillStyle = grad(); ctx.beginPath(); ml.forEach(p => ctx.lineTo(p[0], p[1])); [...hl].reverse().forEach(p => ctx.lineTo(p[0], p[1])); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(8,10,4,.3)"; ctx.lineWidth = Math.max(.5, .001 * L);
    for (let u = .02; u < .19; u += .009) { ctx.beginPath(); ctx.moveTo(X(u), Y(u, .82)); ctx.lineTo(X(u), Y(u, 1)); ctx.stroke(); }
    ctx.fillStyle = "rgba(10,10,6,.55)"; for (let u = .012; u < .17; u += .0065) { ctx.beginPath(); ctx.arc(X(u), Y(u, mouthAt(u) + .1 + rnd(u * 99) * .1), .0011 * L, 0, TAU); ctx.fill(); }
  });
  // upper head
  rot(upA, () => {
    ctx.fillStyle = grad(); ctx.beginPath(); hu.forEach(p => ctx.lineTo(p[0], p[1])); [...ml].reverse().forEach(p => ctx.lineTo(p[0], p[1])); ctx.closePath(); ctx.fill();
    // skull texture
    ctx.strokeStyle = "rgba(8,10,4,.22)"; ctx.lineWidth = Math.max(.5, .001 * L);
    for (let u = .03; u < .19; u += .013) { ctx.beginPath(); ctx.moveTo(X(u), Y(u, .02)); ctx.lineTo(X(u + .004), Y(u, .3)); ctx.stroke(); }
    // integumentary sensory organs: dots along the upper jaw
    ctx.fillStyle = "rgba(10,10,6,.6)";
    for (let u = .008; u < .16; u += .0055) { ctx.beginPath(); ctx.arc(X(u), Y(u, mouthAt(u) - .12 - rnd(u * 77) * .18), .00115 * L, 0, TAU); ctx.fill(); }
    // nostril on the nasal boss
    ctx.fillStyle = "#0d0e08"; ctx.beginPath(); ctx.ellipse(X(.013), Y(.013, .08), .0045 * L, .0018 * L, 0, 0, TAU); ctx.fill();
    // rim light
    ctx.strokeStyle = "rgba(255,226,170,.3)"; ctx.lineWidth = Math.max(.8, .0016 * L); ctx.beginPath(); hu.forEach(p => ctx.lineTo(p[0], p[1] + .5)); ctx.stroke();
    // eye
    const ex = X(.148), ey = Y(.148, .2), er = .0058 * L;
    ctx.fillStyle = "#14150d"; ctx.beginPath(); ctx.ellipse(ex, ey, er * 1.55, er * 1.15, 0, 0, TAU); ctx.fill();
    const ig = ctx.createRadialGradient(ex - er * .3, ey - er * .3, er * .1, ex, ey, er);
    ig.addColorStop(0, "#e6c85a"); ig.addColorStop(.6, "#a9963c"); ig.addColorStop(1, "#4b4a1c");
    const open = o.eye == null ? 1 : o.eye;
    ctx.save(); ctx.beginPath(); ctx.ellipse(ex, ey, er * 1.3, er * .95 * Math.max(.08, open), 0, 0, TAU); ctx.clip();
    ctx.fillStyle = ig; ctx.fillRect(ex - er * 2, ey - er * 2, er * 4, er * 4);
    ctx.fillStyle = "#070704"; ctx.beginPath(); ctx.ellipse(ex, ey, er * .18, er * .85, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,250,230,.7)"; ctx.beginPath(); ctx.arc(ex + er * .45, ey - er * .4, er * .18, 0, TAU); ctx.fill();
    if (o.membrane) { ctx.fillStyle = `rgba(190,200,185,${.72 * o.membrane})`; ctx.fillRect(ex - er * 2, ey - er * 2, er * 4, er * 4); }
    ctx.restore();
    ctx.strokeStyle = "#2a2b1b"; ctx.lineWidth = er * .5; ctx.beginPath(); ctx.ellipse(ex, ey - er * .2, er * 1.5, er * 1.1, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    // ear slit
    ctx.strokeStyle = "#0f100a"; ctx.lineWidth = .0024 * L; ctx.beginPath(); ctx.moveTo(X(.168), Y(.168, .17)); ctx.lineTo(X(.182), Y(.182, .15)); ctx.stroke();
  });
  rot(upA, () => teeth(true));
  rot(loA, () => teeth(false));

  // belly / back showing during the roll
  if (roll) {
    ctx.save(); ctx.clip(body);
    if (sr < 0) { ctx.fillStyle = `rgba(200,184,138,${-sr * .65})`; ctx.fill(body); }
    else { ctx.fillStyle = `rgba(20,22,12,${sr * .45})`; ctx.fill(body); }
    ctx.restore();
  }
  leg(.275, false, false); leg(.47, true, false);
  if (shade) { ctx.fillStyle = `rgba(30,28,16,${shade})`; ctx.globalCompositeOperation = "source-atop"; ctx.fill(body); ctx.globalCompositeOperation = "source-over"; }

  if (anchors) {
    const m = ctx.getTransform();
    const pt = (x, y) => applyM(m, x, y);
    anchors.eye = pt(X(.148), Y(.148, .2)); anchors.jaw = pt(X(.07), Y(.07, .75)); anchors.throat = pt(X(.2), Y(.2, .8));
    anchors.tail = pt(X(.8), Y(.8, .4)); anchors.snout = pt(X(.01), Y(.01, .3)); anchors.body = pt(X(.38), Y(.38, .2));
  }
  ctx.restore();
}

/* ================= wildebeest, side view, facing left ================= */
function drawGnu(ctx, o) {
  const s = o.s, T = o.T || 0;
  ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot || 0); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
  const P = (x, y) => [x * s, y * s];
  const coat = "#4b5050", dark = "#25282a", mane = "#141514", beard = "#c9bea1", legc = "#2f3131";
  const walk = o.walk || 0, kick = o.kick || 0, brace = o.brace || 0;
  const lean = brace * .1;
  ctx.rotate(-lean * .4);
  const ph = T * 6;
  // legs: [x, hind?, far?, phase]
  const legs = [[.08, false, true, 0], [.94, true, true, Math.PI], [0, false, false, Math.PI], [.86, true, false, 0]];
  const drawLeg = ([lx, hind, far, p0]) => {
    const w = Math.sin(ph + p0) * walk * .1 + Math.sin(T * 17 + p0 * 3 + lx * 9) * kick * .16;
    const splay = (o.drop || 0) * (hind ? 0 : (far ? .08 : -.12)) - brace * (hind ? -.12 : .2);
    const pts = hind
      ? [[lx, -.7], [lx - .04 + w * .4, -.5], [lx + .08 + w + splay * .6, -.29], [lx + .03 + w * 1.3 + splay, -.08], [lx + .02 + w * 1.4 + splay, 0]]
      : [[lx, -.62], [lx + .02 + w * .3, -.47], [lx + w * .9 + splay * .6, -.27], [lx + .02 + w * 1.3 + splay, -.07], [lx - .01 + w * 1.4 + splay, 0]];
    ctx.strokeStyle = far ? "#1c1e1f" : legc; ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let i = 0; i < pts.length - 1; i++) {
      ctx.lineWidth = s * [.11, .07, .045, .04][i]; ctx.beginPath(); ctx.moveTo(...P(...pts[i])); ctx.lineTo(...P(...pts[i + 1])); ctx.stroke();
    }
    ctx.fillStyle = "#0e0f0e"; const [hx, hy] = P(...pts[4]); ctx.beginPath(); ctx.ellipse(hx, hy - s * .015, s * .03, s * .022, 0, 0, TAU); ctx.fill();
  };
  drawLeg(legs[0]); drawLeg(legs[1]);
  // body
  const body = newPath(o);
  body.moveTo(...P(-.1, -.66));
  body.bezierCurveTo(...P(-.11, -.55), ...P(-.06, -.49), ...P(.02, -.48));
  body.bezierCurveTo(...P(.25, -.44), ...P(.55, -.45), ...P(.78, -.5));
  body.bezierCurveTo(...P(.92, -.53), ...P(1.02, -.6), ...P(1.05, -.72));
  body.bezierCurveTo(...P(1.06, -.82), ...P(1.0, -.88), ...P(.92, -.88));
  body.bezierCurveTo(...P(.62, -.9), ...P(.36, -.94), ...P(.2, -1.04));
  body.bezierCurveTo(...P(.12, -1.08), ...P(.02, -1.04), ...P(-.04, -.95));
  body.closePath();
  const bg = ctx.createLinearGradient(0, -1.05 * s, 0, -.44 * s); bg.addColorStop(0, "#3c4040"); bg.addColorStop(.6, coat); bg.addColorStop(1, "#5c5f5b");
  ctx.fillStyle = bg; ctx.fill(body);
  ctx.save(); ctx.clip(body);
  ctx.strokeStyle = "rgba(14,16,16,.45)"; ctx.lineCap = "round";
  for (let i = 0; i < 9; i++) { const x = .0 + i * .055; ctx.lineWidth = s * (.012 + rnd(i) * .01); ctx.beginPath(); ctx.moveTo(...P(x + .02, -1.05)); ctx.quadraticCurveTo(...P(x + .05, -.8), ...P(x + .01, -.45)); ctx.stroke(); }
  const rim = ctx.createLinearGradient(0, -1.06 * s, 0, -.9 * s); rim.addColorStop(0, "rgba(255,214,150,.25)"); rim.addColorStop(1, "rgba(255,214,150,0)");
  ctx.fillStyle = rim; ctx.fill(body);
  ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(...P(-.2, -.56), s * 1.4, s * .2);
  ctx.restore();
  // tail
  ctx.strokeStyle = dark; ctx.lineWidth = s * .03; ctx.beginPath(); ctx.moveTo(...P(1.03, -.84)); ctx.quadraticCurveTo(...P(1.13 + Math.sin(T * 3) * .02, -.66), ...P(1.1, -.5)); ctx.stroke();
  ctx.fillStyle = mane; ctx.beginPath(); ctx.ellipse(...P(1.1, -.44), s * .035, s * .1, .1, 0, TAU); ctx.fill();
  // neck + head
  const d = o.drop || 0, pull = o.pull || 0;
  const na = lerp(-2.45, 2.2, d) + pull, ha = lerp(2.55, 1.95, d) + pull;
  const n0 = P(-.03, -.84), nl = .5 * s;
  const n1 = [n0[0] + Math.cos(na) * nl, n0[1] + Math.sin(na) * nl];
  const perp = a => [-Math.sin(a), Math.cos(a)];
  const [px, py] = perp(na);
  const side = d > .5 ? -1 : 1;
  const nb = .16 * s, nt = .09 * s;
  ctx.fillStyle = coat;
  ctx.beginPath(); ctx.moveTo(n0[0] + px * nb, n0[1] + py * nb); ctx.lineTo(n1[0] + px * nt, n1[1] + py * nt); ctx.lineTo(n1[0] - px * nt, n1[1] - py * nt); ctx.lineTo(n0[0] - px * nb, n0[1] - py * nb); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(14,16,16,.35)"; ctx.fill();
  // mane (upper edge) and beard (lower edge)
  const up = side; // which perpendicular is "up"
  ctx.strokeStyle = mane; ctx.lineWidth = s * .012;
  for (let i = 0; i <= 14; i++) { const t = i / 14, bx = lerp(n0[0] + px * nb * up, n1[0] + px * nt * up, t), by = lerp(n0[1] + py * nb * up, n1[1] + py * nt * up, t); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + px * up * s * .06, by + py * up * s * .06 - s * .02); ctx.stroke(); }
  ctx.strokeStyle = beard; ctx.globalAlpha *= .9;
  for (let i = 0; i <= 16; i++) { const t = .15 + i / 16 * .8, bx = lerp(n0[0] - px * nb * up, n1[0] - px * nt * up, t), by = lerp(n0[1] - py * nb * up, n1[1] - py * nt * up, t); ctx.lineWidth = s * .008; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - px * up * s * .02, by + s * (.1 + rnd(i) * .06)); ctx.stroke(); }
  ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
  // head
  ctx.save(); ctx.translate(n1[0], n1[1]); ctx.rotate(ha); if (side < 0) ctx.scale(1, -1);
  const H = (x, y) => [x * s, y * s];
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.moveTo(...H(-.02, -.09)); ctx.bezierCurveTo(...H(.12, -.11), ...H(.3, -.085), ...H(.4, -.07));
  ctx.bezierCurveTo(...H(.46, -.06), ...H(.47, .03), ...H(.43, .06)); ctx.bezierCurveTo(...H(.38, .08), ...H(.25, .08), ...H(.16, .09));
  ctx.bezierCurveTo(...H(.06, .1), ...H(-.03, .08), ...H(-.04, .0)); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(255,214,150,.14)"; ctx.beginPath(); ctx.ellipse(...H(.2, -.075), s * .17, s * .015, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#060606"; ctx.beginPath(); ctx.ellipse(...H(.42, -.02), s * .018, s * .012, .4, 0, TAU); ctx.fill();
  ctx.fillStyle = "#0b0a08"; ctx.beginPath(); ctx.arc(...H(.13, -.045), s * .016, 0, TAU); ctx.fill();
  ctx.fillStyle = "rgba(255,240,210,.5)"; ctx.beginPath(); ctx.arc(...H(.135, -.05), s * .005, 0, TAU); ctx.fill();
  // ear
  ctx.fillStyle = "#1d1f1f"; ctx.beginPath(); ctx.moveTo(...H(.02, -.08)); ctx.lineTo(...H(-.1, -.14)); ctx.lineTo(...H(.0, -.04)); ctx.fill();
  // horn: out from the skull, down, then hooking up
  ctx.strokeStyle = "#3a3934"; ctx.lineCap = "round";
  ctx.lineWidth = s * .04; ctx.beginPath(); ctx.moveTo(...H(.06, -.09)); ctx.quadraticCurveTo(...H(.0, -.13), ...H(-.01, -.17)); ctx.stroke();
  ctx.lineWidth = s * .022; ctx.beginPath(); ctx.moveTo(...H(-.01, -.17)); ctx.quadraticCurveTo(...H(-.01, -.24), ...H(.08, -.25)); ctx.stroke();
  ctx.restore();
  // muzzle in world coords
  const mz = [n1[0] + Math.cos(ha) * .44 * s, n1[1] + Math.sin(ha) * .44 * s];
  drawLeg(legs[2]); drawLeg(legs[3]);
  ctx.restore();
  const c = Math.cos(o.rot || 0), sn = Math.sin(o.rot || 0);
  return { mx: o.x + mz[0] * c - mz[1] * sn, my: o.y + mz[0] * sn + mz[1] * c };
}

/* ================= static background (cached) ================= */
function paintBackground(ctx) {
  const { W, H, WY } = SCENE;
  let g = ctx.createLinearGradient(0, 0, 0, WY);
  g.addColorStop(0, "#0a120f"); g.addColorStop(.55, "#1a1f17"); g.addColorStop(.86, "#4a3a1e"); g.addColorStop(1, "#5c4622");
  ctx.fillStyle = g; ctx.fillRect(-2000, -500, W + 4000, WY + 500);
  const sun = ctx.createRadialGradient(300, WY - 18, 4, 300, WY - 18, 340); sun.addColorStop(0, "rgba(255,196,110,.42)"); sun.addColorStop(.25, "rgba(226,150,60,.16)"); sun.addColorStop(1, "rgba(226,150,60,0)");
  ctx.fillStyle = sun; ctx.fillRect(-2000, 0, W + 4000, WY);
  // far bank with acacias and a distant herd
  ctx.fillStyle = "#161b14";
  ctx.beginPath(); ctx.moveTo(-2000, WY); ctx.lineTo(-2000, WY - 12); for (let x = 0; x <= 900; x += 20) ctx.lineTo(x, WY - 12 - Math.sin(x * .013) * 4 - rnd(x) * 3); ctx.lineTo(900, WY); ctx.fill();
  const acacia = (x, y, sc) => {
    ctx.strokeStyle = "#11150f"; ctx.lineWidth = 2.2 * sc; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2 * sc, y - 26 * sc); ctx.lineTo(x - 10 * sc, y - 38 * sc); ctx.moveTo(x + 2 * sc, y - 26 * sc); ctx.lineTo(x + 14 * sc, y - 40 * sc); ctx.stroke();
    ctx.fillStyle = "#11150f"; ctx.beginPath(); ctx.ellipse(x + 2 * sc, y - 42 * sc, 34 * sc, 6 * sc, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + 12 * sc, y - 45 * sc, 18 * sc, 4 * sc, 0, 0, TAU); ctx.fill();
  };
  acacia(110, WY - 12, .9); acacia(520, WY - 14, 1.15); acacia(760, WY - 10, .7);
  ctx.fillStyle = "#0f130e";
  for (let i = 0; i < 38; i++) { const x = 180 + i * 7.5 + rnd(i) * 5, y = WY - 13 - rnd(i + 3) * 2; ctx.fillRect(x, y - 4, 5, 3); ctx.fillRect(x, y - 1, 1, 3); ctx.fillRect(x + 4, y - 1, 1, 3); ctx.fillRect(x - 1.5, y - 5, 2, 2); }
  // water body (behind everything)
  g = ctx.createLinearGradient(0, WY, 0, H); g.addColorStop(0, "#3e3a22"); g.addColorStop(.4, "#2a2817"); g.addColorStop(1, "#0d0e09");
  ctx.fillStyle = g; ctx.fillRect(-2000, WY, W + 4000, H - WY + 500);
  // riverbed
  ctx.fillStyle = "#16150d"; ctx.beginPath(); ctx.moveTo(-2000, H + 500); ctx.lineTo(-2000, 588); ctx.lineTo(0, 588); for (let x = 0; x <= 720; x += 24) ctx.lineTo(x, 588 - Math.sin(x * .02) * 5 - rnd(x + 1) * 6); ctx.lineTo(720, H + 500); ctx.fill();
  for (let i = 0; i < 30; i++) { ctx.fillStyle = `rgba(10,10,6,${.5 + rnd(i) * .4})`; ctx.beginPath(); ctx.ellipse(rnd(i + 7) * 720, 590 + rnd(i + 2) * 20, 6 + rnd(i + 5) * 16, 3 + rnd(i + 6) * 6, 0, 0, TAU); ctx.fill(); }
}
function paintBank(ctx) {
  const { W, H, WY } = SCENE;
  // near bank: mud slope that runs from the riverbed up past the waterline
  const bank = newPath();
  bank.moveTo(640, H); bank.bezierCurveTo(760, 520, 860, 380, 925, WY + 4); bank.bezierCurveTo(955, 282, 985, 268, 1030, 266); bank.lineTo(W + 2000, 258); bank.lineTo(W + 2000, H + 500); bank.lineTo(640, H + 500); bank.closePath();
  let g = ctx.createLinearGradient(900, 250, 760, 620); g.addColorStop(0, "#56452c"); g.addColorStop(.25, "#3d3120"); g.addColorStop(1, "#18140c");
  ctx.fillStyle = g; ctx.fill(bank);
  ctx.save(); ctx.clip(bank);
  // trampled mud, hoof prints, strata
  for (let i = 0; i < 70; i++) { const x = 920 + rnd(i) * 280, y = 262 + rnd(i + 30) * 40; ctx.fillStyle = `rgba(20,14,8,${.35 + rnd(i + 2) * .3})`; ctx.beginPath(); ctx.ellipse(x, y, 3 + rnd(i + 4) * 3, 1.4, 0, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = "rgba(0,0,0,.18)"; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(780 + k * 20, H); ctx.bezierCurveTo(860 + k * 20, 480, 920 + k * 30, 360 + k * 10, W, 330 + k * 30); ctx.stroke(); }
  ctx.fillStyle = "rgba(255,210,150,.12)"; ctx.fillRect(920, 258, 300, 5);
  ctx.restore();
  // grass and reeds on top of the bank
  for (let i = 0; i < 160; i++) {
    const x = 1040 + rnd(i) * 170, y = 262 - (x - 1030) * .05, h = 10 + rnd(i + 1) * 22;
    ctx.strokeStyle = `rgba(${60 + rnd(i + 2) * 40},${58 + rnd(i + 3) * 30},${28},.9)`; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 2, y - h * .6, x + (rnd(i + 4) - .5) * 10, y - h); ctx.stroke();
  }
  for (let i = 0; i < 22; i++) {
    const x = 1110 + rnd(i + 70) * 90, h = 60 + rnd(i + 71) * 70;
    ctx.strokeStyle = "#2b2c19"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, 262); ctx.quadraticCurveTo(x + 3, 262 - h * .6, x + (rnd(i + 72) - .3) * 14, 262 - h); ctx.stroke();
    ctx.fillStyle = "#3b301c"; ctx.beginPath(); ctx.ellipse(x + (rnd(i + 72) - .3) * 14, 262 - h - 6, 2, 8, .2, 0, TAU); ctx.fill();
  }
}

/* ================= water overlay ================= */
function paintWater(ctx, T, ripples, fx, dt) {
  const { W, H, WY } = SCENE;
  ctx.save();
  ctx.beginPath(); ctx.rect(-2000, WY, W + 4000, H - WY + 500); ctx.clip();
  // murk: the Mara is brown with silt
  ctx.fillStyle = "rgba(78,66,34,.34)"; ctx.fillRect(-2000, WY, W + 4000, H - WY + 500);
  const g = ctx.createLinearGradient(0, WY, 0, H); g.addColorStop(0, "rgba(14,14,8,0)"); g.addColorStop(.35, "rgba(14,14,8,.35)"); g.addColorStop(1, "rgba(8,8,5,.82)");
  ctx.fillStyle = g; ctx.fillRect(-2000, WY, W + 4000, H - WY); ctx.fillStyle = "rgba(8,8,5,.82)"; ctx.fillRect(-2000, H, W + 4000, 500);
  // light shafts
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 7; i++) {
    const x = 80 + i * 150 + Math.sin(T * .3 + i) * 20, w = 30 + rnd(i) * 50;
    const sg = ctx.createLinearGradient(0, WY, 0, WY + 260); sg.addColorStop(0, "rgba(255,200,120,.06)"); sg.addColorStop(1, "rgba(255,200,120,0)");
    ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(x, WY); ctx.lineTo(x + w, WY); ctx.lineTo(x + w - 90, WY + 260); ctx.lineTo(x - 90, WY + 260); ctx.fill();
  }
  // suspended silt
  for (let i = 0; i < 90; i++) {
    const x = (rnd(i) * W + T * (4 + rnd(i + 1) * 6)) % W, y = WY + 6 + rnd(i + 2) * (H - WY - 10) + Math.sin(T + i) * 3;
    ctx.fillStyle = `rgba(230,200,140,${.05 + rnd(i + 3) * .08})`; ctx.fillRect(x, y, 1.6, 1.6);
  }
  ctx.globalCompositeOperation = "source-over";
  // bubbles
  if (fx.bubbles > 0) {
    ctx.strokeStyle = "rgba(240,230,200,.45)"; ctx.lineWidth = 1;
    for (let k = 0; k < 26 * fx.bubbles; k++) { const bx = fx.bx - 60 + rnd(k) * 140 + Math.sin(T * 3 + k) * 4, by = fx.by - ((T * (50 + rnd(k + 1) * 40) + k * 37) % 240); if (by > WY + 3) { ctx.beginPath(); ctx.arc(bx, by, 1.2 + rnd(k + 2) * 3, 0, TAU); ctx.stroke(); } }
  }
  // swirl during the roll
  if (fx.swirl > 0) {
    ctx.strokeStyle = `rgba(232,224,204,${.16 * fx.swirl})`; ctx.lineWidth = 1.3;
    for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(fx.sx, fx.sy, 160 + k * 26, 36 + k * 9, 0, T * 4 + k, T * 4 + k + 1.4); ctx.stroke(); }
  }
  ctx.restore();
  // surface: meniscus and a band of reflected sky
  const rg = ctx.createLinearGradient(0, WY, 0, WY + 22); rg.addColorStop(0, "rgba(255,206,130,.14)"); rg.addColorStop(1, "rgba(255,206,130,0)");
  ctx.fillStyle = rg; ctx.fillRect(-2000, WY, 2930, 22);
  ctx.strokeStyle = "rgba(240,225,190,.42)"; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = -600; x <= 935; x += 6) ctx.lineTo(x, WY + Math.sin(x * .05 + T * 2) * .7); ctx.stroke();
  for (let i = 0; i < 18; i++) { ctx.fillStyle = `rgba(255,190,100,${.16 * (1 - i / 18)})`; ctx.fillRect(((i * 173 + T * 7) % 1100) - 50, WY + 3 + i * 2.2, 36 + (i * 29) % 70, 1); }
  ripples.draw(ctx, dt);
}
function Ripples() { this.list = []; }
Ripples.prototype.add = function (x, max = 80, life = 2.4) { this.list.push({ x, t: 0, max, life }); if (this.list.length > 30) this.list.shift(); };
Ripples.prototype.draw = function (ctx, dt) {
  this.list = this.list.filter(r => (r.t += dt) < r.life);
  for (const r of this.list) {
    const k = r.t / r.life, rad = (1 - Math.pow(1 - k, 3)) * r.max;
    for (let j = 0; j < 3; j++) { const rr = rad - j * r.max * .13; if (rr <= 1) continue; ctx.strokeStyle = `rgba(240,225,190,${(1 - k) * .5 * (1 - j * .3)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(r.x, SCENE.WY, rr, rr * .09, 0, 0, TAU); ctx.stroke(); }
  }
};

function callout(ctx, p, text, dx, dy, a) {
  if (!p || a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  const [x, y] = p, tx = x + dx, ty = y + dy;
  ctx.strokeStyle = "rgba(226,168,60,.9)"; ctx.fillStyle = "#e2a83c"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.lineTo(tx + (dx < 0 ? -14 : 14), ty); ctx.stroke();
  ctx.font = "500 12px 'IBM Plex Mono', monospace"; ctx.textBaseline = "middle"; ctx.textAlign = dx < 0 ? "right" : "left";
  ctx.lineWidth = 4; ctx.strokeStyle = "rgba(6,10,8,.85)"; ctx.strokeText(text.toUpperCase(), tx + (dx < 0 ? -18 : 18), ty);
  ctx.fillStyle = "#efe6cf"; ctx.fillText(text.toUpperCase(), tx + (dx < 0 ? -18 : 18), ty);
  ctx.restore();
}

/* ================= wiring ================= */
export function mount({ doc = globalThis.document, env = globalThis, now = () => performance.now(), raf = f => requestAnimationFrame(f), rng = mulberry32(7), defer = (f, ms) => setTimeout(f, ms) } = {}) {
  RM = reducedMotion(env); PATH = env.Path2D || null;
  const track = doc.getElementById("hunt-track"), cv = doc.getElementById("hunt-c");
  if (!track || !cv) return;
  const lis = [...doc.querySelectorAll("#stages li")];
  const romanEl = doc.getElementById("h-roman"), bodyEl = doc.getElementById("h-body");
  const { W, H, WY, L, M } = SCENE;
  let bgCanvas = null, bgKey = "";
  const ripples = new Ripples(), splash = [];
  let cur = -1, last = now(), T = 0, nextRipple = 0;

  function setStage(i) {
    if (i === cur) return; cur = i;
    lis.forEach((li, k) => li.classList.toggle("on", k === i));
    [romanEl, bodyEl].forEach(e => e.classList.add("out"));
    defer(() => {
      const st = STAGES[i];
      romanEl.textContent = st.n;
      bodyEl.innerHTML = `<p class="h-kicker">${st.t}</p><h3>${st.h}</h3><p>${st.p}</p><p class="h-note">${st.note}</p>`;
      [romanEl, bodyEl].forEach(e => e.classList.remove("out"));
    }, RM ? 0 : 180);
  }
  const progress = () => { const r = track.getBoundingClientRect(), span = r.height - env.innerHeight; return span <= 0 ? 0 : clamp(-r.top / span, 0, 1); };
  const visible = () => { const r = track.getBoundingClientRect(); return r.bottom > 0 && r.top < env.innerHeight; };

  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    raf(frame);
    if (!visible()) return;
    T += RM ? 0 : dt;
    const p = progress(), s = Math.min(6.999, p * 7);
    setStage(Math.floor(s));
    lis.forEach((li, k) => li.querySelector("b").style.transform = `scaleX(${clamp(s - k, 0, 1)})`);

    const r = cv.getBoundingClientRect(), d = Math.min(env.devicePixelRatio || 1, 2);
    const cw = Math.max(1, Math.round(r.width * d)), ch = Math.max(1, Math.round(r.height * d));
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    const ctx = cv.getContext("2d");
    // cover-fit the scene, keeping the bank and the crocodile in view
    const sc = Math.max(r.width / W, r.height / H), fitW = 1;
    const ox = (r.width - W * sc) / 2, oy = (r.height - H * sc) * .3;
    const key = `${cw}x${ch}`;
    if (bgKey !== key) {
      bgKey = key; bgCanvas = doc.createElement("canvas"); bgCanvas.width = cw; bgCanvas.height = ch;
      const b = bgCanvas.getContext("2d"); b.setTransform(d * sc, 0, 0, d * sc, d * ox, d * oy); paintBackground(b); paintBank(b);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cw, ch); ctx.drawImage(bgCanvas, 0, 0);
    ctx.setTransform(d * sc, 0, 0, d * sc, d * ox, d * oy);
    const inv = invertM(ctx.getTransform());
    const toScene = q => q && applyM(inv, q[0], q[1]);

    const { c, g, c2, fx } = pose(s, T);
    // second crocodile (behind)
    if (c2.on > 0) drawCroc(ctx, { L: L * .82, x: c2.x, y: c2.y, T, swim: .9, jaw: c2.jaw, alpha: c2.on, eye: 0, membrane: 1, shade: .1 });
    // wildebeest: on the bank, then dragged in
    const gm = drawGnu(ctx, { x: g.x, y: g.y, s: 1.3 * M, T, drop: g.drop, kick: g.kick, brace: g.brace, walk: g.walk, rot: g.rot, pull: g.brace * .12 });
    const anchors = {};
    drawCroc(ctx, { L, x: c.x, y: c.y, pitch: c.pitch, jaw: c.jaw, roll: c.roll, limbs: c.limbs, swim: c.swim, eye: c.eye, membrane: c.membrane, tailKick: c.tailKick, T }, anchors);
    // re-draw the wildebeest head over the jaws during the strike so the grip reads
    fx.bx = gm.mx; fx.by = Math.max(gm.my, WY + 20); fx.sx = c.x - 120; fx.sy = c.y + 10;
    if (fx.ripple && T > nextRipple && !RM) { ripples.add(gm.mx, 60, 2.6); nextRipple = T + 1.1 + rng(); }
    if (s < 1 && T > nextRipple - .5 && !RM && rng() < dt * .5) ripples.add(c.x - .14 * L, 40, 2.2);
    if (fx.splash > .2 && !RM && splash.length < 140) for (let i = 0; i < 6; i++) splash.push({ x: c.x - 40 + rng() * 140, y: WY, vx: (rng() - .25) * 220, vy: -150 - rng() * 330, t: 0, r: .6 + rng() * 1.6 });
    paintWater(ctx, T, ripples, fx, RM ? 0 : dt);
    // splash
    for (let i = splash.length - 1; i >= 0; i--) { const q = splash[i]; q.t += dt; q.vy += 700 * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.y > WY + 4 || q.t > 2) { splash.splice(i, 1); continue; } ctx.strokeStyle = `rgba(245,232,200,${.7 - q.t * .3})`; ctx.lineWidth = q.r; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * .018, q.y - q.vy * .018); ctx.stroke(); }
    if (fx.splash > 0) { ctx.fillStyle = `rgba(240,228,200,${.18 * fx.splash})`; ctx.beginPath(); ctx.ellipse(c.x - 60, WY, 170, 10, 0, 0, TAU); ctx.fill(); }

    // callouts
    const A = k => toScene(anchors[k]);
    const loc = s - Math.floor(s), fade = Math.min(seg(loc, .15, .3), 1 - seg(loc, .85, .97));
    const st = Math.floor(s);
    if (st === 0) callout(ctx, A("eye"), "Eyes, ears, nostrils: all that shows", -60, -80, fade);
    if (st === 1) { callout(ctx, A("jaw"), "Pressure sensors on the jaws", 40, 90, fade); callout(ctx, A("eye"), "Third eyelid closed", -70, -60, fade); }
    if (st === 2) callout(ctx, A("eye"), "Eyes up, body still", -80, -90, fade);
    if (st === 3) callout(ctx, A("tail"), "One sweep of the tail", -40, 110, fade);
    if (st === 4) callout(ctx, A("throat"), "Palatal valve shut", -90, 80, fade);
    if (st === 5) callout(ctx, A("body"), "Legs tucked, head and tail bent", -70, 120, fade);
    if (st === 6) callout(ctx, A("throat"), "Head up to swallow", -110, -70, fade);

    // scale bar
    ctx.fillStyle = "rgba(200,190,160,.8)"; ctx.font = "500 12px 'IBM Plex Mono', monospace"; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    ctx.fillRect(40, H - 26, M, 1); ctx.fillRect(40, H - 31, 1, 10); ctx.fillRect(40 + M, H - 31, 1, 10); ctx.fillText("1 M · TO SCALE", 48 + M, H - 22);
    void fitW;
  }
  raf(frame);
}

export { drawCroc, drawGnu, paintWater, Ripples, callout };
