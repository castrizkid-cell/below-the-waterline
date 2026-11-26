// Paints one frame of the hunt film onto a 2D context. No DOM, no clock, no randomness:
// everything comes in through the frame (film-time.mjs) and the water state (film-fx.mjs).
import { clamp, lerp } from "./math.mjs";
import { HINGE, skin, shade, UPPER_TEETH, LOWER_TEETH, limbChain, gnuHead, gnuLegs, gnuToWorld, GNU_AXIS } from "./film-anatomy.mjs";
import { groundY, EDGE_X } from "./film-time.mjs";

const TAU = Math.PI * 2;
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const sm = (x, a, b) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };

// world → screen
export function viewOf(W, H, cam, t = 0) {
  const s = W / cam.w;
  const jx = cam.shake * s * (Math.sin(t * 93.1) + Math.sin(t * 57.3) * .6), jy = cam.shake * s * (Math.sin(t * 71.7 + 1) + Math.sin(t * 43.1) * .6);
  const X = x => (x - cam.x) * s + W / 2 + jx, Y = y => (y - cam.y) * s + H / 2 + jy;
  return { W, H, s, X, Y, x0: cam.x - W / 2 / s, x1: cam.x + W / 2 / s, y0: cam.y - H / 2 / s, y1: cam.y + H / 2 / s };
}

// ---------------------------------------------------------------- sky, far bank, far water
function paintSky(ctx, v, t) {
  const { W, H } = v, wy = v.Y(0);
  if (wy <= 0) return wy;
  const hz = Math.min(wy - H * .035, H * .5);
  const g = ctx.createLinearGradient(0, 0, 0, hz);
  g.addColorStop(0, "#1c2230"); g.addColorStop(.45, "#4c4446"); g.addColorStop(.8, "#b07a45"); g.addColorStop(1, "#e7ab5c");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, Math.min(wy, H) + 1);
  // sun, low over the far bank
  const sx = W * .3 - v.X(0) * .02, sy = hz - H * .09, sr = H * .028;
  let rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, H * .55);
  rg.addColorStop(0, "rgba(255,214,140,.55)"); rg.addColorStop(.12, "rgba(255,176,90,.28)"); rg.addColorStop(1, "rgba(255,150,70,0)");
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, wy);
  ctx.fillStyle = "#fff0c8"; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.fill();
  // far bank: low hills, acacias, the herd strung along the skyline
  const px = x => x * v.s * .08 - v.X(0) * .03;
  ctx.fillStyle = "#2b261f"; ctx.beginPath(); ctx.moveTo(0, hz + 2);
  for (let x = 0; x <= W; x += 8) { const k = (x + v.X(0) * .03) / W; ctx.lineTo(x, hz - H * (.012 + .018 * (Math.sin(k * 9) * .5 + .5) * (Math.sin(k * 3.3 + 1) * .5 + .5))); }
  ctx.lineTo(W, hz + 2); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 7; i++) {
    const x = ((hash(i) * 1.6 - .3) * W - v.X(0) * .03), h = H * (.04 + hash(i + 9) * .035), y = hz - H * .012;
    ctx.strokeStyle = "#221e19"; ctx.lineWidth = Math.max(1, H * .003); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + h * .05, y - h * .8); ctx.stroke();
    ctx.fillStyle = "#221e19"; ctx.beginPath(); ctx.ellipse(x + h * .05, y - h * .85, h * (.7 + hash(i + 3) * .4), h * .16, 0, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = "#1d1a16";
  for (let i = 0; i < 70; i++) {
    const k = hash(i * 3.1), x = ((k * 1.4 + t * .004) % 1.4 - .2) * W - v.X(0) * .03, y = hz - H * (.011 + hash(i) * .004), sz = H * .006;
    ctx.fillRect(x, y - sz, sz * 1.8, sz * .9);
    ctx.fillRect(x + (Math.sin(t * 6 + i) > 0 ? 0 : sz * .3), y - sz * .2, sz * .2, sz * .7);
    ctx.fillRect(x + sz * 1.4, y - sz * .2, sz * .2, sz * .7);
  }
  // haze over the horizon
  const hg = ctx.createLinearGradient(0, hz - H * .08, 0, hz + 2);
  hg.addColorStop(0, "rgba(231,171,92,0)"); hg.addColorStop(1, "rgba(231,171,92,.35)");
  ctx.fillStyle = hg; ctx.fillRect(0, hz - H * .08, W, H * .08 + 2);
  // the river's surface running away to the far bank, catching the sun
  if (wy > hz) {
    const wg = ctx.createLinearGradient(0, hz, 0, wy);
    wg.addColorStop(0, "#c68f50"); wg.addColorStop(.5, "#6f5634"); wg.addColorStop(1, "#3f3624");
    ctx.fillStyle = wg; ctx.fillRect(0, hz, W, wy - hz + 1);
    for (let i = 0; i < 60; i++) {
      const k = i / 60, y = lerp(hz, wy, k * k), w = (6 + 40 * k) * (H / 700) * (.4 + hash(i + Math.floor(t * 3)) * .9);
      const x = sx + (hash(i * 7.7) - .5) * W * (.03 + k * .22);
      ctx.fillStyle = `rgba(255,222,160,${.5 * (1 - k) * hash(i * 1.3 + Math.floor(t * 4))})`; ctx.fillRect(x - w / 2, y, w, Math.max(1, H * .002));
    }
  }
  return wy;
}

// ---------------------------------------------------------------- the bank and riverbed
function paintGround(ctx, v, t) {
  const { X, Y, H } = v, x0 = v.x0 - 1, x1 = v.x1 + 1, step = (x1 - x0) / 140;
  ctx.beginPath(); ctx.moveTo(X(x0), Y(groundY(x0)));
  for (let x = x0; x <= x1; x += step) ctx.lineTo(X(x), Y(groundY(x)));
  ctx.lineTo(X(x1), H + 10); ctx.lineTo(X(x0), H + 10); ctx.closePath();
  const g = ctx.createLinearGradient(0, Y(-.7), 0, Y(3.4));
  g.addColorStop(0, "#7d6544"); g.addColorStop(.12, "#5d4a31"); g.addColorStop(.17, "#3b3020"); g.addColorStop(.5, "#2b2418"); g.addColorStop(1, "#16130d");
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  // trampled mud: hoof prints by the drinking place, pebbles and cracks on the bed
  for (let i = 0; i < 160; i++) {
    const x = lerp(14, 32, hash(i * 1.7)); if (x < x0 || x > x1) continue;
    const gy = groundY(x), above = gy < 0, y = gy + hash(i * 5.3) * (above ? .25 : .35);
    ctx.fillStyle = above ? `rgba(40,30,18,${.35 + hash(i) * .3})` : `rgba(10,9,6,${.3 + hash(i) * .3})`;
    ctx.beginPath(); ctx.ellipse(X(x), Y(y), v.s * (above ? .05 : .04) * (.6 + hash(i * 2.2)), v.s * .018, 0, 0, TAU); ctx.fill();
  }
  // wet line on the bank
  ctx.fillStyle = "rgba(25,20,13,.35)"; ctx.fillRect(X(EDGE_X), Y(-.08), X(EDGE_X + .7) - X(EDGE_X), v.s * .1);
  ctx.restore();
  // a sunken branch on the bed
  ctx.strokeStyle = "#1c170f"; ctx.lineCap = "round"; ctx.lineWidth = v.s * .07;
  ctx.beginPath(); ctx.moveTo(X(10.5), Y(3.15)); ctx.quadraticCurveTo(X(12), Y(2.9), X(13.6), Y(3.05)); ctx.stroke();
  ctx.lineWidth = v.s * .035; ctx.beginPath(); ctx.moveTo(X(12.4), Y(2.97)); ctx.lineTo(X(12.9), Y(2.6)); ctx.stroke();
}
function paintReeds(ctx, v, t, front) {
  const { X, Y, s } = v;
  for (let i = 0; i < 90; i++) {
    if ((hash(i * 9.1) > .5) !== front) continue;
    const x = 23.2 + hash(i * 2.3) * 9; if (x < v.x0 - 1 || x > v.x1 + 1) continue;
    const base = groundY(x), h = .5 + hash(i * 4.4) * (x > 25 ? 1.6 : .9), lean = Math.sin(t * .9 + x) * .05 + (hash(i) - .5) * .25;
    ctx.strokeStyle = front ? `rgba(${60 + hash(i) * 40 | 0},${70 + hash(i * 3) * 30 | 0},36,.95)` : "rgba(52,52,30,.8)";
    ctx.lineWidth = Math.max(1, s * .012);
    ctx.beginPath(); ctx.moveTo(X(x), Y(base)); ctx.quadraticCurveTo(X(x + lean * .3), Y(base - h * .6), X(x + lean), Y(base - h)); ctx.stroke();
    if (hash(i * 6.6) > .7) { ctx.fillStyle = "#4a3a22"; ctx.beginPath(); ctx.ellipse(X(x + lean), Y(base - h), s * .02, s * .07, lean, 0, TAU); ctx.fill(); }
  }
}

// ---------------------------------------------------------------- water volume and surface
function surfacePath(ctx, v, fx, close) {
  const { X, Y } = v, x0 = v.x0 - .5, x1 = v.x1 + .5, n = 160;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n); ctx[i ? "lineTo" : "moveTo"](X(x), Y(fx.surface(x))); }
  if (close) { ctx.lineTo(X(x1), v.H + 20); ctx.lineTo(X(x0), v.H + 20); ctx.closePath(); }
}
function paintDeep(ctx, v, fx) {
  surfacePath(ctx, v, fx, true);
  const g = ctx.createLinearGradient(0, v.Y(0), 0, v.Y(3.4));
  g.addColorStop(0, "#5a5233"); g.addColorStop(.3, "#3a3622"); g.addColorStop(1, "#14140c");
  ctx.fillStyle = g; ctx.fill();
}
function paintMurk(ctx, v, fx, t) {
  const { X, Y, H, s } = v;
  surfacePath(ctx, v, fx, true);
  ctx.save(); ctx.clip();
  const g = ctx.createLinearGradient(0, Y(0), 0, Y(3.2));
  g.addColorStop(0, "rgba(92,82,46,.30)"); g.addColorStop(.25, "rgba(60,56,32,.46)"); g.addColorStop(1, "rgba(18,18,11,.72)");
  ctx.fillStyle = g; ctx.fillRect(0, Y(-.3), v.W, H);
  // shafts of light, slanting away from the sun
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 9; i++) {
    const wx = Math.floor(v.x0) + i * 1.9 + Math.sin(t * .3 + i) * .4 - (Math.floor(v.x0) % 2), w = .25 + hash(i) * .5, len = 2.6 + hash(i + 2) * 1.2;
    const lg = ctx.createLinearGradient(0, Y(0), 0, Y(len));
    lg.addColorStop(0, `rgba(255,214,140,${.07 + .05 * Math.sin(t * .7 + i * 2)})`); lg.addColorStop(1, "rgba(255,214,140,0)");
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(X(wx), Y(0)); ctx.lineTo(X(wx + w), Y(0)); ctx.lineTo(X(wx + w + len * .45), Y(len)); ctx.lineTo(X(wx + len * .45 - w), Y(len)); ctx.closePath(); ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  // suspended silt catching the light
  for (let i = 0; i < 140; i++) {
    const x = v.x0 + ((hash(i * 3.3) * (v.x1 - v.x0) + t * .05 * (hash(i) - .3)) % (v.x1 - v.x0 + .01));
    const y = .05 + ((hash(i * 7.1) * 3.2 + t * .02) % 3.2);
    ctx.fillStyle = `rgba(220,200,150,${.12 + hash(i * 2) * .18})`; ctx.fillRect(X(x), Y(y), Math.max(1, s * .008), Math.max(1, s * .008));
  }
  // the underside of the surface: a silver mirror band
  const ug = ctx.createLinearGradient(0, Y(0), 0, Y(.18));
  ug.addColorStop(0, "rgba(210,190,140,.32)"); ug.addColorStop(1, "rgba(210,190,140,0)");
  ctx.fillStyle = ug; ctx.fillRect(0, Y(-.1), v.W, s * .3);
  ctx.restore();
  // the meniscus
  surfacePath(ctx, v, fx, false);
  ctx.strokeStyle = "rgba(255,232,190,.55)"; ctx.lineWidth = Math.max(1, s * .008); ctx.stroke();
}

// ---------------------------------------------------------------- particles
function paintParticles(ctx, v, fx, kinds) {
  const { X, Y, s } = v;
  for (const p of fx.P) {
    if (!kinds.includes(p.k)) continue;
    const a = 1 - p.age / p.life;
    if (p.k === "drop") {
      const sp = Math.hypot(p.vx, p.vy) || 1, len = Math.min(.06, sp * .005 + p.r * .4);
      ctx.strokeStyle = `rgba(240,226,196,${(.35 + .5 * (1 - p.r / .07)) * a})`; ctx.lineWidth = Math.max(.7, p.r * s * .32); ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(X(p.x), Y(p.y)); ctx.lineTo(X(p.x - p.vx / sp * len), Y(p.y - p.vy / sp * len)); ctx.stroke();
    } else if (p.k === "bubble") {
      ctx.strokeStyle = `rgba(230,220,190,${.5 * a})`; ctx.lineWidth = Math.max(.8, s * .004);
      ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), Math.max(1, p.r * s), 0, TAU); ctx.stroke();
      ctx.fillStyle = `rgba(255,245,220,${.35 * a})`; ctx.fillRect(X(p.x) - p.r * s * .4, Y(p.y) - p.r * s * .5, Math.max(1, p.r * s * .3), Math.max(1, p.r * s * .3));
    } else if (p.k === "foam") {
      ctx.fillStyle = `rgba(232,220,192,${.42 * a})`; ctx.beginPath(); ctx.ellipse(X(p.x), Y(fx.surface(p.x)), p.r * s, Math.max(1, p.r * s * .18), 0, 0, TAU); ctx.fill();
    } else {
      const col = p.k === "blood" ? "96,28,20" : "92,78,52", alpha = (p.k === "blood" ? .22 : .2) * Math.sin(Math.PI * Math.min(1, p.age / p.life));
      const r = p.r * s, gg = ctx.createRadialGradient(X(p.x), Y(p.y), 0, X(p.x), Y(p.y), r);
      gg.addColorStop(0, `rgba(${col},${alpha})`); gg.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = gg; ctx.fillRect(X(p.x) - r, Y(p.y) - r, r * 2, r * 2);
    }
  }
}

// ---------------------------------------------------------------- the crocodile
function pathPts(ctx, pts, v) { ctx.beginPath(); pts.forEach((p, i) => ctx[i ? "lineTo" : "moveTo"](v.X(p.x), v.Y(p.y))); }
function limb(ctx, v, cf, which, near, k, base, paddle) {
  const pts = limbChain(cf, which, near, k, paddle), sc = cf.L / 4.5;
  const widths = which === "front" ? [.12, .085, .06] : [.17, .12, .075];
  const col = mul(base, near ? .82 : .5);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = rgb(col); ctx.lineWidth = widths[i] * sc * v.s;
    ctx.beginPath(); ctx.moveTo(v.X(pts[i].x), v.Y(pts[i].y)); ctx.lineTo(v.X(pts[i + 1].x), v.Y(pts[i + 1].y)); ctx.stroke();
  }
  // toes, splayed from the last joint, with dark claws
  const a = pts[2], b = pts[3], ang = Math.atan2(b.y - a.y, b.x - a.x), n = which === "front" ? 5 : 4;
  for (let i = 0; i < n; i++) {
    const d = ang + (i - (n - 1) / 2) * .28, len = (.08 + (i === 1 || i === 2 ? .03 : 0)) * sc;
    const ex = b.x + Math.cos(d) * len, ey = b.y + Math.sin(d) * len;
    ctx.strokeStyle = rgb(col); ctx.lineWidth = .026 * sc * v.s;
    ctx.beginPath(); ctx.moveTo(v.X(b.x), v.Y(b.y)); ctx.lineTo(v.X(ex), v.Y(ey)); ctx.stroke();
    if (i < 3) { ctx.strokeStyle = "#191712"; ctx.lineWidth = .012 * sc * v.s; ctx.beginPath(); ctx.moveTo(v.X(ex), v.Y(ey)); ctx.lineTo(v.X(ex + Math.cos(d) * .025 * sc), v.Y(ey + Math.sin(d) * .025 * sc)); ctx.stroke(); }
  }
}
function tooth(ctx, v, base, dir, back, len, alpha = 1) {
  const w = len * .38, tip = { x: base.x + dir[0] * len - back[0] * len * .18, y: base.y + dir[1] * len - back[1] * len * .18 };
  ctx.fillStyle = `rgba(236,228,200,${alpha})`; ctx.strokeStyle = `rgba(120,110,80,${.6 * alpha})`; ctx.lineWidth = Math.max(.5, v.s * .003);
  ctx.beginPath();
  ctx.moveTo(v.X(base.x - back[0] * w), v.Y(base.y - back[1] * w));
  ctx.quadraticCurveTo(v.X(base.x + dir[0] * len * .6), v.Y(base.y + dir[1] * len * .6), v.X(tip.x), v.Y(tip.y));
  ctx.lineTo(v.X(base.x + back[0] * w), v.Y(base.y + back[1] * w)); ctx.closePath(); ctx.fill(); ctx.stroke();
}
export function paintCroc(ctx, v, f, between) {
  const cf = f.cf, c = f.croc, roll = cf.roll, cr = Math.cos(roll);
  const rings = cf.mesh(64, 14), K = 14;
  const base = [118, 110, 64];
  // far limbs behind the body
  const nearSide = cr >= 0;
  limb(ctx, v, cf, "front", !nearSide, c.limbs, base, c.swim * .2);
  limb(ctx, v, cf, "hind", !nearSide, c.limbs * .7, base, c.swim * .2);
  // the inside of the mouth
  if (c.jaw > .015 && Math.abs(cr) > .3) {
    const up = [], lo = [];
    for (const r of rings) { if (r.u > HINGE + .01) break; up.push(r.up[cr > 0 ? K : 0]); lo.push(r.lo[cr > 0 ? 0 : K]); }
    const hp = cf.surface(HINGE + .015, Math.PI * .7, null);
    ctx.beginPath(); [...up, hp, ...lo.reverse()].forEach((p, i) => ctx[i ? "lineTo" : "moveTo"](v.X(p.x), v.Y(p.y))); ctx.closePath();
    const tip = up[0], g = ctx.createLinearGradient(v.X(tip.x), v.Y(tip.y), v.X(hp.x), v.Y(hp.y));
    g.addColorStop(0, "#d9c48e"); g.addColorStop(.45, "#b8946a"); g.addColorStop(.85, "#7a4a3a"); g.addColorStop(1, "#3a2420");
    ctx.fillStyle = g; ctx.fill();
    // depth: the far side of the mouth falls into shadow
    const mid = up[Math.floor(up.length / 2)], mlo = lo[Math.floor(lo.length / 2)];
    const sg2 = ctx.createLinearGradient(v.X(mid.x), v.Y(mid.y), v.X(mlo.x), v.Y(mlo.y));
    sg2.addColorStop(0, "rgba(40,22,16,.45)"); sg2.addColorStop(.5, "rgba(40,22,16,0)"); sg2.addColorStop(1, "rgba(40,22,16,.3)");
    ctx.fillStyle = sg2; ctx.fill();
    // tongue on the floor of the mouth, palatal valve at the back
    ctx.save(); ctx.clip();
    ctx.fillStyle = "rgba(214,170,120,.8)"; pathPts(ctx, lo.slice(0, Math.max(2, lo.length - 2)), v); ctx.lineWidth = v.s * .07; ctx.strokeStyle = "rgba(200,150,110,.7)"; ctx.stroke();
    ctx.fillStyle = "rgba(160,92,74,.9)"; ctx.beginPath(); ctx.ellipse(v.X(hp.x), v.Y(hp.y), v.s * .07, v.s * .05, 0, 0, TAU); ctx.fill();
    ctx.restore();
    // the far row of teeth seen through the gape
    for (const [u, len] of UPPER_TEETH) { const p = cf.surface(u, -cf.cutAngle(u) * Math.sign(cr), "upper"), q = cf.surface(u, cf.cutAngle(u) * Math.sign(cr), "lower"); const d = norm(q.x - p.x, q.y - p.y); tooth(ctx, v, p, d, fwd(cf, u), len * .8, .55); }
    for (const [u, len] of LOWER_TEETH) { const q = cf.surface(u, -cf.cutAngle(u) * Math.sign(cr), "lower"), p = cf.surface(u, cf.cutAngle(u) * Math.sign(cr), "upper"); const d = norm(p.x - q.x, p.y - q.y); tooth(ctx, v, q, d, fwd(cf, u), len * .8, .55); }
  }
  if (between) between();
  // the body: shaded quads, far to near; seams between them read as rows of scales
  const quads = [];
  for (let i = 0; i < rings.length - 1; i++) {
    const A = rings[i], B = rings[i + 1];
    for (const arc of ["up", "lo"]) for (let j = 0; j < K; j++) {
      const p = A[arc][j], q = A[arc][j + 1], r = B[arc][j + 1], s = B[arc][j];
      const nw = (p.nw + q.nw + r.nw + s.nw) / 4; if (nw < -.08) continue;
      const nv = (p.nv + q.nv + r.nv + s.nv) / 4, u = (A.u + B.u) / 2, phi = (p.phi + q.phi) / 2;
      const wet = (p.y + r.y) / 2 < 0 ? 1 : .15;
      quads.push({ pts: [p, q, r, s], z: (p.z + r.z) / 2 + nw * .1, col: shade(skin(u, phi, i, j + (arc === "lo" ? 40 : 0)), nv, nw, wet) });
    }
  }
  quads.sort((a, b) => a.z - b.z);
  for (const qd of quads) {
    const [p, q, r, s] = qd.pts;
    ctx.beginPath(); ctx.moveTo(v.X(p.x), v.Y(p.y)); ctx.lineTo(v.X(q.x), v.Y(q.y)); ctx.lineTo(v.X(r.x), v.Y(r.y)); ctx.lineTo(v.X(s.x), v.Y(s.y)); ctx.closePath();
    const size = Math.abs(v.X(r.x) - v.X(p.x)) + Math.abs(v.Y(r.y) - v.Y(p.y));
    ctx.fillStyle = rgb(qd.col); ctx.fill();
    ctx.strokeStyle = size > 9 ? rgb(mul(qd.col, .84)) : rgb(qd.col); ctx.lineWidth = size > 9 ? Math.min(1.1, size * .045) : .8; ctx.stroke();
  }
  // osteoderms: keeled knobs in rows down the back and neck
  for (let u = .19; u < .52; u += .0155) for (const ph of [-.52, -.3, -.1, .1, .3, .52]) {
    const p = cf.surface(u, ph, null, .012); if (p.nw < -.25) continue;
    const col = shade(mul([78, 76, 48], .9 + hash(u * 900 + ph) * .2), p.nv, p.nw, p.y < 0 ? 1 : .2);
    ctx.fillStyle = rgb(col); ctx.strokeStyle = rgb(mul(col, .6)); ctx.lineWidth = Math.max(.5, v.s * .004);
    ctx.beginPath(); ctx.ellipse(v.X(p.x), v.Y(p.y), v.s * .026, v.s * .017 * (.5 + .5 * Math.abs(cr)), (f.croc.pitch || 0) * .3, 0, TAU); ctx.fill(); ctx.stroke();
  }
  // tail crests: a double row of upright scales that merges into one
  for (let u = .5; u < .99; u += .0145) {
    const rows = u < .78 ? [-.2, .2] : [0];
    for (const ph of rows) {
      const a = cf.surface(u, ph, null), b = cf.surface(u + .0145, ph, null), h = .06 * (1.15 - u) * cf.L / 4.5;
      const tip = cf.surface(u + .007, ph, null, h); if (a.nw < -.6) continue;
      const col = shade([66, 66, 42], a.nv, a.nw, a.y < 0 ? 1 : .2);
      ctx.fillStyle = rgb(col); ctx.beginPath(); ctx.moveTo(v.X(a.x), v.Y(a.y)); ctx.lineTo(v.X(tip.x), v.Y(tip.y)); ctx.lineTo(v.X(b.x), v.Y(b.y)); ctx.closePath(); ctx.fill();
    }
  }
  // near limbs
  limb(ctx, v, cf, "front", nearSide, c.limbs, base, c.swim * .2);
  limb(ctx, v, cf, "hind", nearSide, c.limbs * .7, base, c.swim * .2);
  // near teeth: interlocking along the lips, the big 4th lower tooth showing when shut
  if (Math.abs(cr) > .35) {
    const sg = Math.sign(cr);
    for (const [u, len] of UPPER_TEETH) {
      const p = cf.surface(u, cf.cutAngle(u) * sg, "upper"), q = cf.surface(u, cf.cutAngle(u) * sg, "lower");
      const d = c.jaw > .05 ? norm(q.x - p.x, q.y - p.y) : downOf(cf, -(c.jaw || 0) * .1, cr);
      tooth(ctx, v, p, d, fwd(cf, u), len * (c.jaw > .05 ? 1 : .8));
    }
    for (const [u, len] of LOWER_TEETH) {
      const q = cf.surface(u, cf.cutAngle(u) * sg, "lower"), p = cf.surface(u, cf.cutAngle(u) * sg, "upper");
      const d = c.jaw > .05 ? norm(p.x - q.x, p.y - q.y) : downOf(cf, cf.jawA, -cr);
      tooth(ctx, v, q, d, fwd(cf, u), len * (c.jaw > .05 ? 1 : .75));
    }
  }
  // nostrils on their raised disc
  const n = cf.surface(.012, 0, "upper", .012);
  if (n.nv < .3) { ctx.fillStyle = rgb(shade([84, 80, 52], n.nv, n.nw)); ctx.beginPath(); ctx.ellipse(v.X(n.x), v.Y(n.y), v.s * .045, v.s * .025, f.croc.pitch, 0, TAU); ctx.fill(); ctx.fillStyle = "#14120c"; ctx.beginPath(); ctx.ellipse(v.X(n.x), v.Y(n.y), v.s * .02, v.s * .007, f.croc.pitch, 0, TAU); ctx.fill(); }
  // eyes: raised orbits, yellow-green iris, vertical slit; third eyelid under water
  for (const sg of [1, -1]) {
    const e = cf.surface(.152, .42 * sg, "upper", .02); if (e.nw < -.15) continue;
    const r = v.s * .022, sq = clamp(.35 + e.nw, .3, 1);
    ctx.fillStyle = rgb(shade([96, 92, 58], e.nv, e.nw)); ctx.beginPath(); ctx.ellipse(v.X(e.x), v.Y(e.y), r * 1.7 * sq, r * 1.25, 0, 0, TAU); ctx.fill();
    const ig = ctx.createRadialGradient(v.X(e.x), v.Y(e.y), 0, v.X(e.x), v.Y(e.y), r);
    ig.addColorStop(0, "#d9c656"); ig.addColorStop(.75, "#9c8a2c"); ig.addColorStop(1, "#4b4114");
    ctx.fillStyle = ig; ctx.beginPath(); ctx.ellipse(v.X(e.x), v.Y(e.y), r * sq, r * .9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#0a0906"; ctx.beginPath(); ctx.ellipse(v.X(e.x), v.Y(e.y), r * .16 * sq, r * .78, f.croc.pitch * .5, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,250,230,.8)"; ctx.beginPath(); ctx.arc(v.X(e.x) - r * .35 * sq, v.Y(e.y) - r * .35, Math.max(.8, r * .16), 0, TAU); ctx.fill();
    if (c.membrane > 0) { ctx.fillStyle = `rgba(176,190,160,${.62 * c.membrane})`; ctx.beginPath(); ctx.ellipse(v.X(e.x), v.Y(e.y), r * sq * 1.05, r * .95, 0, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = "rgba(30,28,18,.85)"; ctx.lineWidth = Math.max(1, v.s * .009); ctx.beginPath(); ctx.ellipse(v.X(e.x), v.Y(e.y) + r * .1, r * 1.25 * sq, r * 1.05, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
  }
  // a torn piece of the carcass held in the jaws
  if (c.chunk) {
    const g = cf.grip(), a = cf.at(0).a;
    ctx.save(); ctx.translate(v.X(g.x + .06), v.Y(g.y)); ctx.rotate(a + .25); const k = v.s;
    ctx.fillStyle = "#4b4c4e"; ctx.beginPath(); ctx.moveTo(-.02 * k, -.07 * k); ctx.quadraticCurveTo(.2 * k, -.1 * k, .26 * k, -.02 * k); ctx.quadraticCurveTo(.22 * k, .09 * k, .02 * k, .07 * k); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#7c2c20"; ctx.beginPath(); ctx.ellipse(.2 * k, .02 * k, .07 * k, .05 * k, .3, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#2a2624"; ctx.lineWidth = .012 * k; ctx.beginPath(); ctx.moveTo(.1 * k, -.08 * k); ctx.lineTo(.12 * k, .07 * k); ctx.moveTo(.16 * k, -.07 * k); ctx.lineTo(.17 * k, .06 * k); ctx.stroke();
    ctx.restore();
  }
}
const norm = (x, y) => { const d = Math.hypot(x, y) || 1; return [x / d, y / d]; };
const fwd = (cf, u) => { const p = cf.at(u); return [Math.cos(p.a), Math.sin(p.a)]; };
const downOf = (cf, extra, sgn) => { const a = cf.at(0).a + extra; return [-Math.sin(a) * Math.sign(sgn), Math.cos(a) * Math.sign(sgn)]; };

// ---------------------------------------------------------------- the wildebeest
// Drawn in its own local frame (metres, facing left), so the same code serves the hero animal,
// the herd on the bank, and the carcass rolled belly-up.
export function paintGnu(ctx, v, p, tone = 1, detail = true) {
  ctx.save();
  ctx.translate(v.X(p.x), v.Y(p.y)); ctx.rotate(p.rot || 0); ctx.scale(v.s * (p.size || 1), v.s * (p.size || 1));
  const fl = Math.cos(p.axial || 0);
  ctx.translate(0, GNU_AXIS); ctx.scale(1, fl === 0 ? .001 : fl); ctx.translate(0, -GNU_AXIS);
  const C = (c, k = 1) => rgb(mul(c, tone * k));
  const hd = gnuHead(p.drop || 0), P = hd.poll, D = hd.dir, Q = [D[1], -D[0]];   // Q: toward the throat
  const H = (a, b) => [P[0] + D[0] * a + Q[0] * b, P[1] + D[1] * a + Q[1] * b];
  const legs = gnuLegs(p);
  const drawLeg = (L, k) => {
    const w = L.front ? [.11, .07, .045, .05] : [.15, .085, .05, .05];
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let i = 0; i < 4; i++) {
      const [ax, ay] = L.pts[i], [bx, by] = L.pts[i + 1], d = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / d, ny = (bx - ax) / d;
      const w0 = w[i] / 2, w1 = (w[i + 1] || w[i] * .8) / 2;
      ctx.fillStyle = i === 3 ? C([18, 17, 16], k) : C(i < 2 ? [66, 64, 62] : [40, 38, 36], k);
      ctx.beginPath(); ctx.moveTo(ax + nx * w0, ay + ny * w0); ctx.lineTo(bx + nx * w1, by + ny * w1); ctx.lineTo(bx - nx * w1, by - ny * w1); ctx.lineTo(ax - nx * w0, ay - ny * w0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(bx, by, w1 * 1.12, 0, TAU); ctx.fill();
    }
  };
  legs.filter(L => L.far).forEach(L => drawLeg(L, .6));
  // tail
  const sw = (p.swish || 0) * .08 * (p.alive ?? 1);
  ctx.strokeStyle = C([24, 22, 21]); ctx.lineWidth = .035; ctx.beginPath(); ctx.moveTo(1.16, -1.1); ctx.quadraticCurveTo(1.27, -.95, 1.24 + sw, -.75); ctx.stroke();
  ctx.lineWidth = .09; ctx.beginPath(); ctx.moveTo(1.24 + sw, -.8); ctx.quadraticCurveTo(1.26 + sw * 1.5, -.62, 1.22 + sw * 2, -.5); ctx.stroke();
  // torso
  const torso = () => {
    ctx.beginPath(); ctx.moveTo(-.36, -1.02);
    ctx.bezierCurveTo(-.44, -.86, -.32, -.72, -.18, -.68);
    ctx.bezierCurveTo(.1, -.62, .55, -.6, .82, -.7);
    ctx.bezierCurveTo(.95, -.74, 1.08, -.8, 1.16, -.86);
    ctx.bezierCurveTo(1.25, -.95, 1.25, -1.08, 1.16, -1.15);
    ctx.bezierCurveTo(1.0, -1.21, .55, -1.21, .25, -1.28);
    ctx.bezierCurveTo(.12, -1.32, 0, -1.37, -.08, -1.35);
    // neck to the head
    const nt = H(.04, -.05), th = H(.18, .13);
    ctx.bezierCurveTo(-.25, -1.32, nt[0] + .12, nt[1] + .02, nt[0], nt[1]);
    ctx.lineTo(th[0], th[1]);
    ctx.bezierCurveTo(th[0] + .15, th[1] + .12, -.28, -1.1, -.36, -1.02);
    ctx.closePath();
  };
  torso();
  const g = ctx.createLinearGradient(0, -1.36, 0, -.6);
  g.addColorStop(0, C([96, 96, 92])); g.addColorStop(.45, C([74, 76, 78])); g.addColorStop(1, C([42, 43, 45]));
  ctx.fillStyle = g; ctx.fill();
  if (detail) {
    ctx.save(); ctx.clip();
    // brindled stripes down the neck, shoulders and ribs
    ctx.strokeStyle = C([40, 40, 42], 1); ctx.globalAlpha = .2;
    for (let i = 0; i < 8; i++) { const x = -.42 + i * .075, w = .022 + hash(i) * .02; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x + .1, -1.45); ctx.quadraticCurveTo(x - .02, -1.0, x + .04, -.55); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // sunlit rim along the back
    ctx.strokeStyle = `rgba(255,196,120,${.22 * tone})`; ctx.lineWidth = .04; ctx.beginPath(); ctx.moveTo(1.15, -1.16); ctx.bezierCurveTo(.9, -1.2, .4, -1.22, -.08, -1.36); ctx.stroke();
    ctx.restore();
    // mane: a dark crest of hair along the neck
    const m0 = [-.1, -1.36], m1 = [P[0] + .02, P[1] - .05];
    ctx.fillStyle = C([26, 25, 24]); ctx.beginPath(); ctx.moveTo(...m0);
    for (let i = 0; i <= 14; i++) { const k = i / 14, x = lerp(m0[0], m1[0], k), y = lerp(m0[1], m1[1], k), up = .05 + .025 * Math.sin(i * 2.3); ctx.lineTo(x + .02, y - up); ctx.lineTo(x + .035, y - .01); }
    ctx.lineTo(m1[0] + .04, m1[1] + .04); ctx.lineTo(m0[0] + .06, m0[1] + .05); ctx.closePath(); ctx.fill();
  }
  if (detail) {
    // beard: long dark hair hanging from the throat down the front of the neck
    const b0 = H(.2, .12), b1 = [-.36, -1.0];
    ctx.fillStyle = C([24, 23, 22]); ctx.beginPath(); ctx.moveTo(...b0);
    for (let i = 0; i <= 10; i++) { const k = i / 10, x = lerp(b0[0], b1[0], k), y = lerp(b0[1], b1[1], k), hang = .16 + .06 * Math.sin(i * 1.7); ctx.lineTo(x + .02, y + hang * (p.axial ? Math.sign(Math.cos(p.axial)) : 1)); }
    ctx.lineTo(b1[0] + .05, b1[1] - .02); ctx.closePath(); ctx.globalAlpha = .9; ctx.fill(); ctx.globalAlpha = 1;
  }
  // the head: long face, broad square muzzle
  ctx.beginPath();
  [[0, -.06], [.12, -.085], [.34, -.07], [.5, -.07], [.57, -.03], [.57, .05], [.46, .08], [.24, .11], [.06, .13], [-.02, .06]].map(([a, b]) => H(a, b)).forEach((q, i) => ctx[i ? "lineTo" : "moveTo"](...q));
  ctx.closePath(); ctx.fillStyle = C([40, 38, 36]); ctx.fill();
  if (detail) {
    // horns: out and down from the boss, then hooking up
    const hb = H(.03, -.07), h1 = H(.12, -.2), h2 = H(.02, -.3), ht = H(-.08, -.27);
    ctx.strokeStyle = C([30, 29, 27]); ctx.lineCap = "round"; ctx.lineWidth = .05; ctx.beginPath(); ctx.moveTo(...hb); ctx.quadraticCurveTo(...h1, ...h2); ctx.stroke();
    ctx.lineWidth = .028; ctx.beginPath(); ctx.moveTo(...h2); ctx.lineTo(...ht); ctx.stroke();
    // ear, eye, nostril
    const e1 = H(.0, .0), e2 = H(-.12, .03); ctx.strokeStyle = C([60, 58, 54]); ctx.lineWidth = .04; ctx.beginPath(); ctx.moveTo(...e1); ctx.lineTo(...e2); ctx.stroke();
    const ey = H(.15, -.045); ctx.fillStyle = "#0c0b0a"; ctx.beginPath(); ctx.arc(ey[0], ey[1], .018, 0, TAU); ctx.fill();
    if ((p.alive ?? 1) > .5) { ctx.fillStyle = "rgba(255,240,210,.7)"; ctx.beginPath(); ctx.arc(ey[0] - .006, ey[1] - .006, .005, 0, TAU); ctx.fill(); }
    const no = H(.54, -.02); ctx.fillStyle = "#0b0a09"; ctx.beginPath(); ctx.ellipse(no[0], no[1], .02, .012, 0, 0, TAU); ctx.fill();
  }
  legs.filter(L => !L.far).forEach(L => drawLeg(L, 1));
  ctx.restore();
}
export const gnuMuzzleWorld = p => gnuToWorld(p, ...gnuHead(p.drop || 0).muzzle);

// the rest of the herd on the bank: grazing, alert, then gone when the river erupts
function paintHerd(ctx, v, t) {
  const spots = [25.2, 26.4, 27.5, 28.9, 30.1, 31.6, 33];
  spots.forEach((x0, i) => {
    const run = Math.max(0, t - 25.85 - i * .08), x = x0 + run * run * 1.6 + Math.min(run, 2) * 2 + (t < 6 ? 0 : 0);
    if (x > v.x1 + 3) return;
    const alert = sm(t, 20.4, 20.8) * (1 - sm(t, 22, 23)) + sm(t, 25.7, 25.9);
    const p = { x, y: -.66, rot: 0, axial: 0, size: .56, drop: run > 0 ? 0 : (1 - alert) * (.8 + .2 * Math.sin(t * .5 + i)), walk: run > 0 ? 1.6 : 0, phase: t * (run > 0 ? 2.6 : 1) + i * .3, swish: Math.sin(t * 1.3 + i), alive: 1 };
    paintGnu(ctx, v, p, .5, false);
  });
}

// ---------------------------------------------------------------- annotations
function paintNotes(ctx, v, f, font) {
  const k = v.H / 620;
  for (const n of f.notes) {
    const an = n.at === "gnu" ? (([x, y]) => ({ x, y }))(gnuMuzzleWorld(f.gnu)) : f.cf.anchor(n.at);
    const ax = v.X(an.x), ay = v.Y(an.y), lx = ax + n.dx * k * n.a, ly = clamp(ay + n.dy * k * n.a, 24 * k, v.H - 96 * k);
    ctx.globalAlpha = n.a;
    ctx.strokeStyle = "#e2a83c"; ctx.lineWidth = Math.max(1, 1.2 * k);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lx, ly); ctx.stroke();
    ctx.fillStyle = "#e2a83c"; ctx.beginPath(); ctx.arc(ax, ay, 3.2 * k, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(226,168,60,.5)"; ctx.beginPath(); ctx.arc(ax, ay, 3.2 * k + 4 * k * (1 + Math.sin(f.t * 5)) , 0, TAU); ctx.stroke();
    const txt = n.text.toUpperCase();
    ctx.font = `500 ${Math.round(11.5 * k)}px ${font}`;
    const tw = (ctx.measureText && ctx.measureText(txt) && ctx.measureText(txt).width) || txt.length * 7 * k;
    let left = n.dx < 0, tx = left ? lx - tw - 10 * k : lx + 10 * k;
    if (tx < 12 * k) { left = false; tx = Math.max(12 * k, lx + 10 * k); }
    if (tx + tw > v.W - 12 * k) tx = v.W - 12 * k - tw;
    ctx.fillStyle = "rgba(8,10,8,.72)"; ctx.fillRect(tx - 6 * k, ly - 10 * k, tw + 12 * k, 20 * k);
    ctx.fillStyle = "#efe6cf"; ctx.textBaseline = "middle"; ctx.fillText(txt, tx, ly + .5);
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- grade
function paintGrade(ctx, v, grain, t) {
  const { W, H } = v;
  ctx.globalCompositeOperation = "soft-light";
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(255,170,90,.35)"); g.addColorStop(1, "rgba(20,70,70,.3)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";
  const vg = ctx.createRadialGradient(W / 2, H * .45, H * .3, W / 2, H * .5, W * .7);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.55)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (grain && grain.width) {
    ctx.globalAlpha = .07; ctx.globalCompositeOperation = "overlay";
    const ox = -Math.floor(hash(Math.floor(t * 24)) * grain.width), oy = -Math.floor(hash(Math.floor(t * 24) + 7) * grain.height);
    for (let y = oy; y < H; y += grain.height) for (let x = ox; x < W; x += grain.width) ctx.drawImage(grain, x, y);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }
}

// ---------------------------------------------------------------- one frame
export function paint(ctx, W, H, f, fx, opts = {}) {
  const v = viewOf(W, H, f.cam, f.t);
  ctx.fillStyle = "#14140c"; ctx.fillRect(0, 0, W, H);
  paintSky(ctx, v, f.t);
  paintReeds(ctx, v, f.t, false);
  paintHerd(ctx, v, f.t);
  paintDeep(ctx, v, fx);
  paintGround(ctx, v, f.t);
  paintParticles(ctx, v, fx, ["silt", "blood"]);
  paintCroc(ctx, v, f, () => paintGnu(ctx, v, f.gnu));
  paintMurk(ctx, v, fx, f.t);
  paintReeds(ctx, v, f.t, true);
  paintParticles(ctx, v, fx, ["bubble", "foam", "drop"]);
  if (opts.notes !== false) paintNotes(ctx, v, f, opts.font || "ui-monospace, monospace");
  paintGrade(ctx, v, opts.grain, f.t);
  return v;
}
