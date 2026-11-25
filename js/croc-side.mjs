// Shared side-view drawing: procedural crocodile (facing left), wildebeest silhouette, ripple rings.
// Pure enough: every drawing function takes the canvas context as a parameter; no globals, no clock, no randomness.
import { lerp, easeOut } from "./math.mjs";
import { COLORS } from "./palette.mjs";

/* Body half-height profile. u: 0 = snout tip, 1 = tail tip. All sizes in units of L. */
export const PROF = [[0,.008],[.03,.014],[.08,.02],[.12,.026],[.155,.036],[.19,.033],[.23,.046],[.30,.060],[.38,.064],[.46,.054],[.53,.036],[.64,.024],[.78,.013],[.9,.007],[1,.0015]];
export function halfH(u) {
  for (let i = 1; i < PROF.length; i++) if (u <= PROF[i][0]) {
    const [a, ha] = PROF[i-1], [b, hb] = PROF[i], t = (u - a) / (b - a);
    return lerp(ha, hb, t*t*(3-2*t));
  }
  return 0;
}

/* Procedural crocodile, side view, facing left.
   opts: L, x (snout x), y (top-of-head y), t (time), sway, jaw (0..1), tilt (rad, head up), roll (0..2PI),
         fill, belly, crest, leg, alpha, eyeGlow, blink, legs, paddle.
   Returns { eye: [x, y] of the eye bump, top, bot } (outline points before tilt). */
export function drawCrocSide(ctx, o) {
  const L = o.L, N = 90, roll = o.roll || 0, sy = Math.cos(roll), show = Math.abs(sy) > .02;
  const top = [], bot = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const hh = halfH(u) * L;
    let cy = o.y + .04 * L + (u > .45 ? (u - .45) * (u - .45) * .09 * L : 0);
    cy += Math.sin(u * 7 - (o.t || 0) * 1.6) * (o.sway || 0) * Math.pow(u, 1.6) * L * .035;
    const x = o.x + u * L;
    top.push([x, cy - hh * .92 * sy]); bot.push([x, cy + hh * 1.0 * sy]);
  }
  ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
  if (o.tilt) { ctx.translate(o.x + .3 * L, o.y + .04 * L); ctx.rotate(o.tilt); ctx.translate(-(o.x + .3 * L), -(o.y + .04 * L)); }
  // legs (behind body)
  if (o.legs !== false && show) {
    ctx.fillStyle = o.leg || "#0d1612";
    [[.27, 1], [.47, 1.25]].forEach(([u, s], k) => {
      const i = Math.round(u * N), [x, y] = bot[i], l = .07 * L * s, sw = Math.sin((o.t || 0) * 2 + k * 2) * (o.paddle || 0);
      ctx.beginPath();
      ctx.moveTo(x - .02 * L, y - .01 * L);
      ctx.quadraticCurveTo(x + .015 * L + sw * .02 * L, y + l * .55 * sy, x + .03 * L + sw * .04 * L, y + l * sy);
      ctx.lineTo(x + .055 * L + sw * .04 * L, y + l * sy + .006 * L);
      ctx.lineTo(x + .02 * L, y + .002 * L);
      ctx.closePath(); ctx.fill();
    });
  }
  // body
  if (show) {
    const g = ctx.createLinearGradient(0, o.y - .07 * L, 0, o.y + .12 * L);
    const back = o.fill || "#1c2a22", belly = o.belly || "#2c3a2c";
    if (sy > 0) { g.addColorStop(0, back); g.addColorStop(1, belly); } else { g.addColorStop(0, "#8e8a6c"); g.addColorStop(1, "#c9c2a2"); }
    ctx.fillStyle = g;
    const jaw = o.jaw || 0, hingeI = Math.round(.17 * N);
    ctx.beginPath();
    ctx.moveTo(top[hingeI][0], top[hingeI][1]);
    for (let i = hingeI; i <= N; i++) ctx.lineTo(top[i][0], top[i][1]);
    for (let i = N; i >= hingeI; i--) ctx.lineTo(bot[i][0], bot[i][1]);
    ctx.closePath(); ctx.fill();
    // head: upper and lower jaws, hinged at u=.17
    const hx = top[hingeI][0], hy = (top[hingeI][1] + bot[hingeI][1]) / 2;
    const up = a => { ctx.save(); ctx.translate(hx, hy); ctx.rotate(a); ctx.translate(-hx, -hy); };
    up(jaw * .28);
    ctx.beginPath(); ctx.moveTo(hx, top[hingeI][1]);
    for (let i = hingeI; i >= 0; i--) ctx.lineTo(top[i][0], top[i][1]);
    for (let i = 0; i <= hingeI; i++) { const m = (top[i][1] + bot[i][1]) / 2; ctx.lineTo(bot[i][0], m + (bot[i][1] - m) * .15); }
    ctx.closePath(); ctx.fill();
    if (jaw > .05) { ctx.fillStyle = "#e8e0cc"; for (let i = 2; i < hingeI; i += 2) { const m = (top[i][1] + bot[i][1]) / 2 + (bot[i][1]-top[i][1])*.07; ctx.beginPath(); ctx.moveTo(top[i][0] - .004 * L, m); ctx.lineTo(top[i][0], m + .011 * L * sy); ctx.lineTo(top[i][0] + .004 * L, m); ctx.fill(); } ctx.fillStyle = g; }
    ctx.restore();
    up(-jaw * .34);
    ctx.beginPath(); ctx.moveTo(hx, bot[hingeI][1]);
    for (let i = hingeI; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
    for (let i = 0; i <= hingeI; i++) { const m = (top[i][1] + bot[i][1]) / 2; ctx.lineTo(top[i][0], m + (bot[i][1] - m) * .15); }
    ctx.closePath(); ctx.fill();
    if (jaw > .05) { ctx.fillStyle = "#e8e0cc"; for (let i = 3; i < hingeI; i += 2) { const m = (top[i][1] + bot[i][1]) / 2 + (bot[i][1]-top[i][1])*.12; ctx.beginPath(); ctx.moveTo(top[i][0] - .004 * L, m); ctx.lineTo(top[i][0], m - .011 * L * sy); ctx.lineTo(top[i][0] + .004 * L, m); ctx.fill(); } }
    if (jaw > .05) { ctx.restore(); up(0); }
    ctx.restore();
    // dorsal scutes: double crest on the tail, bumps on the back
    if (sy > 0) {
      ctx.fillStyle = o.crest || back;
      for (let u = .2; u < .97; u += .022) {
        const i = Math.round(u * N), [x, y] = top[i], s = (u > .5 ? .011 : .006) * L * (1 - u * .55);
        ctx.beginPath(); ctx.moveTo(x - s * .9, y + 1); ctx.lineTo(x, y - s); ctx.lineTo(x + s * .9, y + 1); ctx.fill();
      }
      // scale bands
      ctx.strokeStyle = "rgba(0,0,0,.22)"; ctx.lineWidth = Math.max(.6, L * .0012);
      for (let u = .2; u < .96; u += .018) { const i = Math.round(u * N); ctx.beginPath(); ctx.moveTo(top[i][0], top[i][1] + 1); ctx.lineTo(bot[i][0], bot[i][1] - 1); ctx.stroke(); }
      // eye bump + nostril bump
      const ei = Math.round(.145 * N), [ex, ey] = top[ei];
      ctx.fillStyle = back;
      ctx.beginPath(); ctx.ellipse(ex, ey + .002 * L, .018 * L, .013 * L, 0, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.ellipse(o.x + .018 * L, top[2][1] + .001 * L, .007 * L, .006 * L, 0, Math.PI, 0); ctx.fill();
      if (o.eyeGlow) {
        const er = .0055 * L;
        ctx.fillStyle = COLORS.iris; ctx.globalAlpha *= o.eyeGlow;
        ctx.beginPath(); ctx.ellipse(ex - .004 * L, ey - .004 * L, er * 1.25, er * (o.blink != null ? (1 - o.blink) : 1), 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#120c04"; ctx.beginPath(); ctx.ellipse(ex - .004 * L, ey - .004 * L, er * .22, er * .9 * (o.blink != null ? (1 - o.blink) : 1), 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  ctx.restore();
  return { eye: top[Math.round(.145 * N)], top, bot };
}

/* Wildebeest silhouette, facing left, standing; s = shoulder height in px.
   o: rot, alpha, fill, kick, drop (0 = head up, 1 = drinking), pull. Returns the muzzle point { mx, my }. */
export function drawGnu(ctx, x, y, s, o = {}) {
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
  ctx.fillStyle = o.fill || "#171a14";
  const leg = (lx, ph) => { const k = Math.sin(ph) * (o.kick || 0); ctx.beginPath(); ctx.moveTo(lx - s*.05, -s*.5); ctx.lineTo(lx + k*s*.15 - s*.025, 0); ctx.lineTo(lx + k*s*.15 + s*.025, 0); ctx.lineTo(lx + s*.05, -s*.5); ctx.fill(); };
  leg(s*.05, 0); leg(s*.17, 1.6); leg(s*.78, 2.5); leg(s*.9, .8);
  // body: high shoulders, sloping back
  ctx.beginPath();
  ctx.moveTo(-s*.02, -s*.55);
  ctx.bezierCurveTo(-s*.06, -s*.95, s*.25, -s*1.08, s*.35, -s*.98);
  ctx.bezierCurveTo(s*.6, -s*.88, s*.9, -s*.86, s*1.0, -s*.8);
  ctx.bezierCurveTo(s*1.08, -s*.7, s*1.02, -s*.5, s*.9, -s*.45);
  ctx.bezierCurveTo(s*.6, -s*.42, s*.2, -s*.42, -s*.02, -s*.55); ctx.fill();
  // tail
  ctx.beginPath(); ctx.moveTo(s*1.0, -s*.8); ctx.quadraticCurveTo(s*1.12, -s*.6, s*1.08, -s*.38); ctx.lineWidth = s*.03; ctx.strokeStyle = ctx.fillStyle; ctx.stroke();
  // neck + head
  const d = o.drop == null ? 1 : o.drop;
  ctx.save(); ctx.translate(s*.02, -s*.82); ctx.rotate(lerp(-.15, 1.05, d) + (o.pull || 0));
  ctx.beginPath(); ctx.moveTo(0, -s*.16); ctx.lineTo(-s*.42, -s*.1); ctx.lineTo(-s*.56, s*.0); ctx.lineTo(-s*.58, s*.08); ctx.lineTo(-s*.42, s*.1); ctx.lineTo(0, s*.16); ctx.fill();
  // beard + horns
  ctx.beginPath(); ctx.moveTo(-s*.1, s*.13); ctx.lineTo(-s*.2, s*.24); ctx.lineTo(-s*.3, s*.1); ctx.fill();
  ctx.lineWidth = s*.035; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-s*.36, -s*.1); ctx.quadraticCurveTo(-s*.3, -s*.3, -s*.18, -s*.24); ctx.stroke();
  ctx.restore();
  ctx.restore();
  // muzzle point in world coords (approx) for the strike
  const a = lerp(-.15, 1.05, d) + (o.pull || 0) + (o.rot || 0);
  const mx = x + Math.cos(o.rot||0)*s*.02 - Math.sin(o.rot||0)*(-s*.82);
  const my = y + Math.sin(o.rot||0)*s*.02 + Math.cos(o.rot||0)*(-s*.82);
  return { mx: mx + Math.cos(a + Math.PI) * s*.57, my: my + Math.sin(a + Math.PI) * s*.57 };
}

/* Ripple ring set. Advance with step(dt), then draw(ctx). */
export class Ripples {
  constructor(maxRings = 40) { this.list = []; this.maxRings = maxRings; }
  add(x, y, max = 120, life = 2.6) { this.list.push({ x, y, t: 0, max, life }); if (this.list.length > this.maxRings) this.list.shift(); return this; }
  step(dt) { this.list = this.list.filter(r => (r.t += dt) < r.life); return this; }
  draw(ctx, squash = .12, color = "232,224,204") {
    for (const r of this.list) {
      const k = r.t / r.life, rad = easeOut(k) * r.max;
      for (let j = 0; j < 3; j++) {
        const rr = rad - j * r.max * .12; if (rr <= 1) continue;
        ctx.strokeStyle = `rgba(${color},${(1 - k) * .45 * (1 - j * .28)})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(r.x, r.y, rr, rr * squash, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
    return this;
  }
}
