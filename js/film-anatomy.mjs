// Anatomy for the hunt film. Pure geometry, all in metres, world y pointing DOWN.
//
// The crocodile is a generalised cylinder: a spine running back from the snout, and at every point
// along it an elliptical cross-section (depth from the side profile, width from the plan profile).
// A surface point is addressed by (u, φ): u = 0 at the snout tip, 1 at the tail tip; φ = 0 on the
// dorsal midline, ±π/2 on the flanks, π on the belly. Rolling about the long axis rotates φ.
// The head splits along the mouth line so the lower jaw can drop about the jaw joint.
import { clamp, lerp } from "./math.mjs";
import { sideAt, mouthAt, planAt } from "./hunt-model.mjs";

export const HINGE = .165;                 // jaw joint, as a fraction of total length
export const GAPE = .62;                   // radians at jaw = 1
const sm = (x, a, b) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };

// ---------- the crocodile ----------
// o: { x, y (snout tip, m), pitch (rad, negative = nose up), roll, jaw 0..1, swim, tailKick, bend, t, L }
export function crocFrame(o) {
  const L = o.L || 4.5, N = 72, t = o.t || 0, swim = o.swim || 0;
  const bodyPitch = o.pitch * .12;
  const sp = [];
  let x = o.x, y = o.y, z = 0;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    // pitch carries through the rigid head, then relaxes toward a near-level trunk and tail
    const a = lerp(o.pitch, bodyPitch, sm(u, HINGE, .62)) + swim * .045 * Math.sin(u * 7 - t * 4.2) * sm(u, .45, 1);
    // lateral angle: tail sweeps (seen from the side as foreshortening), head and tail bend for the roll
    const b = (o.tailKick || 0) * 1.25 * sm(u, .45, 1)
      + swim * .3 * Math.sin(u * 6.5 - t * 4.2) * u * u
      + (o.bend || 0) * (sm(u, .5, 1) - .6 * (1 - sm(u, 0, .22)));
    sp.push({ u, x, y, z, a, b });
    const ds = L / N, cb = Math.cos(b);
    x -= Math.cos(a) * cb * ds; y -= Math.sin(a) * cb * ds; z -= Math.sin(b) * ds;
  }
  const at = u => {
    const f = clamp(u, 0, 1) * N, i = Math.min(N - 1, Math.floor(f)), k = f - i, p = sp[i], q = sp[i + 1];
    return { x: lerp(p.x, q.x, k), y: lerp(p.y, q.y, k), z: lerp(p.z, q.z, k), a: lerp(p.a, q.a, k), b: lerp(p.b, q.b, k) };
  };
  const hingeP = at(HINGE);
  const jawA = (o.jaw || 0) * GAPE, skullA = -(o.jaw || 0) * .1, roll = o.roll || 0;
  const cr = Math.cos(roll), sr = Math.sin(roll);

  function section(u) {
    const s = sideAt(u);
    return { c: (s.top + s.bot) / 2 * L, hd: (s.bot - s.top) / 2 * L, hw: planAt(u) * L, top: s.top * L, bot: s.bot * L };
  }
  // where the mouth line cuts the cross-section (as an angle from the dorsal midline)
  function cutAngle(u) {
    if (u >= HINGE) return Math.PI / 2 + (Math.PI / 2 - Math.PI / 2);
    const s = section(u), vm = s.top + (s.bot - s.top) * mouthAt(u);
    return Math.acos(clamp((s.c - vm) / s.hd, -.98, .98));
  }
  // body-frame point (s forward of the spine point, v down, w toward the viewer) → world
  function place(u, s, v, w, part) {
    // jaw rotation happens in the head's (s, v) plane, about the jaw joint
    if (u < HINGE && part) {
      const sv = section(HINGE), vH = sv.top + (sv.bot - sv.top) * mouthAt(HINGE - .001);
      const s0 = (HINGE - u) * L + s, ang = part === "lower" ? jawA : skullA;
      const ca = Math.cos(ang), sa = Math.sin(ang), dv = v - vH;
      s = s0 * ca - dv * sa; v = vH + s0 * sa + dv * ca; u = HINGE;
    }
    const p = u === HINGE ? hingeP : at(u);
    const vr = v * cr - w * sr, wr = v * sr + w * cr;           // roll about the spine
    const cb = Math.cos(p.b), fx = Math.cos(p.a) * cb, fy = Math.sin(p.a) * cb;
    return { x: p.x + fx * s - Math.sin(p.a) * vr, y: p.y + fy * s + Math.cos(p.a) * vr, z: p.z + wr - Math.sin(p.b) * s };
  }
  // a surface point and its rolled normal (nv: down component, nw: toward the viewer)
  function surface(u, phi, part, lift = 0) {
    const sc = section(u);
    const v = sc.c - (sc.hd + lift) * Math.cos(phi), w = (sc.hw + lift) * Math.sin(phi);
    let nv = -Math.cos(phi) / sc.hd, nw = Math.sin(phi) / sc.hw;
    const n = Math.hypot(nv, nw) || 1; nv /= n; nw /= n;
    if (u < HINGE && part === "lower") { const ca = Math.cos(jawA), sa = Math.sin(jawA); nv = nv * ca; }
    const p = place(u, 0, v, w, u < HINGE ? part : null);
    return { ...p, nv: nv * cr - nw * sr, nw: nv * sr + nw * cr };
  }
  // the mesh: rings of points along the body; on the head, an upper arc and a lower (jaw) arc
  function mesh(NU = 64, K = 14) {
    const rings = [];
    for (let i = 0; i <= NU; i++) {
      const u = Math.min(.999, Math.pow(i / NU, 1.08));
      const pc = u < HINGE ? cutAngle(u) : Math.PI / 2;
      const up = [], lo = [];
      for (let j = 0; j <= K; j++) up.push({ ...surface(u, -pc + 2 * pc * j / K, "upper"), phi: -pc + 2 * pc * j / K });
      for (let j = 0; j <= K; j++) { const phi = pc + (2 * Math.PI - 2 * pc) * j / K; lo.push({ ...surface(u, phi, "lower"), phi }); }
      rings.push({ u, up, lo });
    }
    return rings;
  }
  // named points the film anchors callouts and effects to
  function anchor(name) {
    switch (name) {
      case "snout": return place(0, 0, 0, 0);
      case "eye": return surface(.152, .42, "upper", .02);
      case "jaw": return surface(.09, 1.9, "lower");
      case "throat": return surface(.2, 2.8, null);
      case "tail": return surface(.82, 1.5, null);
      case "body": return surface(.36, 1.4, null);
      case "nostril": return surface(.01, 0, "upper", .01);
      default: return place(.5, 0, 0, 0);
    }
  }
  // the bite point: between the jaws, a little behind the tip
  const grip = () => { const a = surface(.03, cutAngle(.03), "upper"), b = surface(.03, cutAngle(.03), "lower"); return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
  return { L, sp, at, section, cutAngle, place, surface, mesh, anchor, grip, jawA, roll };
}

// Skin colour at (u, φ) before lighting. Nile crocodile adult: dark olive back, bronze-olive flanks
// with black mottling, dark crossbands on the tail, pale cream-yellow belly.
const DORSAL = [66, 67, 42], FLANK = [112, 106, 62], BELLY = [212, 200, 154];
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export function skin(u, phi, i = 0, j = 0) {
  let a = Math.abs(((phi + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI);
  const mix = (p, q, k) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k), lerp(p[2], q[2], k)];
  let c = a < 1.1 ? mix(DORSAL, FLANK, sm(a, .4, 1.1)) : mix(FLANK, BELLY, sm(a, 1.55, 2.15));
  let k = 1;
  const band = sm(Math.sin(u * Math.PI * 2 * 10.5 + 1.2) * .5 + .5, .58, .82) * sm(u, .4, .55) * (1 - sm(a, 1.5, 2.0));
  k *= 1 - .42 * band;
  if (u > .14 && u < .55 && a > .7 && a < 1.85 && hash(i * 31.7 + j * 7.3) > .86) k *= .7;   // flank mottling
  if (u < .15 && a > 1.3 && a < 2.3 && hash(i * 13.1 + j * 3.7) > .82) k *= .62;            // speckled jaws
  k *= .95 + .09 * hash(i * 7.1 + j * 13.3);                                                  // scale-to-scale variation
  return [c[0] * k, c[1] * k, c[2] * k];
}
// Lambert + a wet specular sheen. Light from above and slightly toward the viewer.
export function shade(rgb, nv, nw, wet = 1) {
  const d = Math.max(0, -nv * .82 + nw * .42);
  const b = .34 + .78 * d, s = Math.pow(Math.max(0, -nv * .6 + nw * .8), 18) * .5 * wet;
  return [Math.min(255, rgb[0] * b + 255 * s), Math.min(255, rgb[1] * b + 240 * s), Math.min(255, rgb[2] * b + 205 * s)];
}

// Teeth along one side, as [u, length in m]. Big ones where they really are: 4th premaxillary and
// 4th–5th maxillary above; the enlarged 4th lower tooth that shows when the mouth is shut.
export const UPPER_TEETH = [[.008, .022], [.016, .028], [.024, .03], [.032, .046], [.043, .026], [.052, .03], [.062, .038], [.071, .044], [.08, .036], [.09, .03], [.1, .027], [.109, .025], [.118, .022], [.127, .02], [.136, .017], [.145, .014]];
export const LOWER_TEETH = [[.01, .026], [.02, .03], [.035, .05], [.048, .028], [.058, .026], [.068, .028], [.078, .03], [.088, .031], [.099, .028], [.11, .025], [.121, .022], [.132, .019], [.142, .015]];

// Limbs: body-frame offsets (forward, down, out) in metres for a 4.5 m animal, tucked vs extended.
export const LIMBS = {
  front: { u: .215, phi: 1.95, tucked: [[-.19, .05, .1], [-.36, .07, .1], [-.47, .06, .1]], out: [[.06, .16, .16], [.12, .32, .14], [.22, .34, .14]] },
  hind: { u: .44, phi: 2.0, tucked: [[-.24, .07, .13], [-.48, .06, .12], [-.64, .05, .12]], out: [[.12, .2, .2], [-.02, .38, .18], [.14, .4, .18]] },
};
export function limbChain(f, which, near, k, paddle = 0) {
  const d = LIMBS[which], side = near ? 1 : -1, sc = f.L / 4.5;
  const base = f.surface(d.u, side * d.phi, null);
  const pts = [base];
  for (let i = 0; i < 3; i++) {
    const [ts, tv, tw] = d.tucked[i], [os, ov, ow] = d.out[i];
    const wob = paddle * Math.sin(i + paddle * 9) * .03;
    const s = lerp(ts, os, k) * sc + wob, v = lerp(tv, ov, k) * sc, w = lerp(tw, ow, k) * sc * side;
    const sec = f.section(d.u), bv = sec.c - sec.hd * Math.cos(d.phi), bw = sec.hw * Math.sin(d.phi) * side;
    pts.push(f.place(d.u, s, bv + v, bw + w));
  }
  return pts;
}

// ---------- the wildebeest ----------
// Blue wildebeest, side view, facing LEFT. Local metres: origin on the ground under the withers,
// y up is negative. Shoulder height 1.32 m. Pose: drop (head lowered to drink), brace, kick, walk,
// phase, alive, swish. The renderer and the pinning both read joints from here.
export const GNU_AXIS = -.95;              // height of the long axis the carcass rolls about
export function gnuHead(drop) {
  const poll = [lerp(-.6, -.8, drop), lerp(-1.6, -.6, drop)];
  const ang = lerp(1.0, 1.36, drop);       // head axis, down from horizontal, pointing forward (-x)
  const dir = [-Math.cos(ang), Math.sin(ang)];
  return { poll, dir, muzzle: [poll[0] + dir[0] * .54, poll[1] + dir[1] * .54] };
}
// legs: joint angles from vertical; each leg = shoulder/hip → elbow/stifle → knee/hock → fetlock → hoof
export function gnuLegs(p) {
  const out = [];
  const LEGS = [
    { root: [-.14, -.86], seg: [.3, .3, .24, .08], front: true, ph: 0 },
    { root: [-.04, -.86], seg: [.3, .3, .24, .08], front: true, ph: Math.PI },
    { root: [.98, -.96], seg: [.36, .36, .26, .08], front: false, ph: Math.PI * .5 },
    { root: [1.06, -.96], seg: [.36, .36, .26, .08], front: false, ph: Math.PI * 1.5 },
  ];
  for (const g of LEGS) {
    const sw = Math.sin((p.phase || 0) * Math.PI * 2 + g.ph);
    const walk = (p.walk || 0) * sw * .38;
    const kick = (p.kick || 0) * Math.sin((p.phase || 0) * 7 + g.ph * 1.7) * .9;
    const brace = (p.brace || 0) * (g.front ? -.42 : .22);
    const dead = 1 - (p.alive ?? 1);
    let th = (g.front ? [.05, -.02, .02, -.25] : [-.35, .55, -.15, -.3]);
    const upright = (p.alive ?? 1) * (1 - (p.kick || 0)) * (g.front ? -1 : 1) * (p.rot || 0);
    th = th.map((a, i) => a + upright + (i < 2 ? walk + brace + kick * (i ? .6 : 1) : walk * .4 + kick * .4) + dead * (g.front ? -.5 : .45) * (i < 2 ? 1 : .3));
    const pts = [g.root];
    let [x, y] = g.root;
    g.seg.forEach((len, i) => { x += Math.sin(th[i]) * len * (g.front ? -1 : 1) * (i === 3 ? 1 : 1); y += Math.cos(th[i]) * len; pts.push([x, y]); });
    out.push({ pts, front: g.front, far: g === LEGS[1] || g === LEGS[3] });
  }
  return out;
}
// local → world for a gnu pose { x, y, rot, axial }
export function gnuToWorld(p, lx, ly) {
  const fl = Math.cos(p.axial || 0), yy = GNU_AXIS + (ly - GNU_AXIS) * fl;
  const c = Math.cos(p.rot || 0), s = Math.sin(p.rot || 0);
  return [p.x + lx * c - yy * s, p.y + lx * s + yy * c];
}
// place the gnu so its muzzle sits exactly at (mx, my)
export function pinMuzzle(p, mx, my) {
  const [lx, ly] = gnuHead(p.drop).muzzle;
  const [wx, wy] = gnuToWorld({ ...p, x: 0, y: 0 }, lx, ly);
  return { ...p, x: mx - wx, y: my - wy };
}
