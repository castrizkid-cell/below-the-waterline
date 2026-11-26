// Pure model for the Hunt section: anatomy profiles, stage text, choreography, plan-view geometry.
// No DOM access. All lengths in units of the crocodile's total length L unless noted.

import { clamp, lerp, seg, ease, easeOut } from "./math.mjs";
export { clamp, lerp, seg, ease, easeOut };

// ---------- side profile (u: 0 = snout tip, 1 = tail tip) ----------
// top/bot are offsets from the body's midline; negative = up.
export const SIDE = [
  [0,    -.0070, .0060], [.012, -.0125, .0080], [.03, -.0110, .0095], [.06, -.0118, .0115],
  [.10,  -.0150, .0140], [.135, -.0230, .0170], [.15, -.0285, .0185], [.165, -.0230, .0215],
  [.19,  -.0235, .0265], [.215, -.0270, .0300], [.26, -.0360, .0420], [.33, -.0415, .0500],
  [.40,  -.0425, .0500], [.46,  -.0400, .0420], [.52, -.0340, .0290], [.62, -.0280, .0200],
  [.75,  -.0200, .0120], [.88,  -.0115, .0060], [1, -.0025, .0010],
];
export function sideAt(u) {
  u = clamp(u, 0, 1);
  for (let i = 1; i < SIDE.length; i++) if (u <= SIDE[i][0]) {
    const [a, ta, ba] = SIDE[i - 1], [b, tb, bb] = SIDE[i], t = (u - a) / (b - a), s = t * t * (3 - 2 * t);
    return { top: lerp(ta, tb, s), bot: lerp(ba, bb, s) };
  }
  return { top: SIDE.at(-1)[1], bot: SIDE.at(-1)[2] };
}
// The mouth line, as a fraction between top (0) and bottom (1) of the head. Crocodile "smile":
// it rises over the enlarged 4th lower tooth (u≈.035) and dips toward the jaw corner.
export function mouthAt(u) {
  const notch = Math.exp(-Math.pow((u - .035) / .012, 2)) * .14;
  const sag = Math.exp(-Math.pow((u - .1) / .04, 2)) * .08;
  return .52 - notch + sag + seg(u, .15, .2) * .06;
}

// ---------- plan view (top-down) ----------
// half-width of the body seen from above
export const PLAN = [
  [0, .010], [.02, .019], [.06, .022], [.10, .027], [.14, .038], [.17, .040], [.20, .031],
  [.26, .052], [.33, .074], [.40, .078], [.46, .068], [.50, .052], [.56, .040], [.66, .030],
  [.80, .018], [.94, .006], [1, .0015],
];
export function planAt(u) {
  u = clamp(u, 0, 1);
  for (let i = 1; i < PLAN.length; i++) if (u <= PLAN[i][0]) {
    const [a, wa] = PLAN[i - 1], [b, wb] = PLAN[i], t = (u - a) / (b - a);
    return lerp(wa, wb, t * t * (3 - 2 * t));
  }
  return PLAN.at(-1)[1];
}
// Spine from the snout backwards. heading: radians the snout points to. bend(u): curvature (rad per L).
export function spine(o, n = 60) {
  const pts = [];
  let x = o.x, y = o.y, h = o.heading + Math.PI; // walk backwards from the snout
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    pts.push({ u, x, y, h: h - Math.PI });
    const k = o.bend ? o.bend(u) : 0;
    h += k / n;
    x += Math.cos(h) * o.L / n; y += Math.sin(h) * o.L / n;
  }
  return pts;
}
const f = v => Math.round(v * 10) / 10;
export function planCroc(o) {
  const pts = spine(o);
  const left = [], right = [];
  for (const p of pts) {
    const w = planAt(p.u) * o.L, nx = -Math.sin(p.h), ny = Math.cos(p.h);
    left.push([p.x + nx * w, p.y + ny * w]); right.push([p.x - nx * w, p.y - ny * w]);
  }
  const ring = [...left, ...right.reverse()];
  const d = "M" + ring.map(([a, b]) => `${f(a)},${f(b)}`).join("L") + "Z";
  const at = u => pts[Math.round(clamp(u, 0, 1) * (pts.length - 1))];
  const legs = [];
  const spread = o.legs == null ? 1 : o.legs; // 1 = splayed walking, 0 = tucked swimming
  [[.27, .7, 1], [.47, .9, -1]].forEach(([u, len, dir]) => {
    const p = at(u);
    for (const side of [1, -1]) {
      const w = planAt(u) * o.L * .85, nx = -Math.sin(p.h) * side, ny = Math.cos(p.h) * side;
      const bx = p.x + nx * w, by = p.y + ny * w;
      const a = p.h + side * lerp(Math.PI * .92, Math.PI * .55 - dir * .35, spread);
      const l = .07 * o.L * len;
      const ex = bx + Math.cos(a) * l, ey = by + Math.sin(a) * l;
      const a2 = a + side * lerp(.1, dir > 0 ? -.9 : .6, spread);
      const fx = ex + Math.cos(a2) * l * .9, fy = ey + Math.sin(a2) * l * .9;
      legs.push(`M${f(bx)},${f(by)}L${f(ex)},${f(ey)}L${f(fx)},${f(fy)}`);
    }
  });
  const eyes = [1, -1].map(s => { const p = at(.145), w = planAt(.145) * o.L * .62; return [f(p.x - Math.sin(p.h) * w * s), f(p.y + Math.cos(p.h) * w * s)]; });
  const scutes = [];
  for (let u = .22; u < .9; u += .028) {
    const p = at(u), rows = u < .52 ? 3 : u < .7 ? 2 : 1, w = planAt(u) * o.L;
    for (let r = 0; r < rows; r++) {
      const off = rows === 1 ? 0 : (r / (rows - 1) - .5) * w * (rows === 3 ? .9 : .5);
      scutes.push([f(p.x - Math.sin(p.h) * off), f(p.y + Math.cos(p.h) * off), f(p.h * 180 / Math.PI)]);
    }
  }
  const snout = at(0);
  return { d, legs, eyes, scutes, snout: [f(snout.x), f(snout.y)], nostril: [f(at(.012).x), f(at(.012).y)] };
}

// ---------- stages ----------
export const STAGES = [
  { n: "I", t: "Watch", h: "It has been here before",
    p: "A big male can hold the same stretch of river for years, and it turns up where the herds come down to drink. For now it lies at the surface twenty metres out. All that shows are the bumps of its eyes and nostrils. It watches.",
    note: "Eyes, ears and nostrils sit in one line on top of the head" },
  { n: "II", t: "Sink", h: "Going under",
    p: "It breathes out and sinks without a ripple. Underwater its eyes can't focus, so it doesn't rely on them. Pressure sensors along its jaws feel every muzzle that touches the water and every hoof that shifts at the edge. It swims with the tail alone, legs pressed flat to its sides.",
    note: "Crocodiles do not focus underwater · Fleishman et al. 1988" },
  { n: "III", t: "Hold", h: "A body length away",
    p: "It stops close to the bank, in water barely deeper than itself, and goes still. Wildebeest drink in short nervous bursts, heads snapping up between mouthfuls. The crocodile waits for the head to stay down. It can hold its breath here for far longer than they will keep drinking.",
    note: "At rest it can stay under for up to about two hours" },
  { n: "IV", t: "Strike", h: "The lunge",
    p: "One sweep of the tail drives the front half of the body out of the river. The jaws open at the last instant and close on the muzzle, the head or a foreleg. Its teeth are cones made to grip, not to cut. Once they close, the contest is mostly decided.",
    note: "16,414 N: the strongest bite measured in a living animal · Erickson et al. 2012" },
  { n: "V", t: "Drown", h: "Back into the deep",
    p: "It doesn't need to kill on the bank. It throws its weight backwards and drags the animal into deep water, where hooves find nothing to push against. A fold of tissue at the back of its throat seals its own airway, so it can hold its mouth open underwater and not drown with its prey.",
    note: "The palatal valve seals the throat from the mouth" },
  { n: "VI", t: "Roll", h: "The death roll",
    p: "A crocodile cannot chew or slice. To take a piece from something this big it locks its jaws, presses its legs to its body, bends its head and tail to one side and spins on its long axis. The twist tears off a mouthful. Others arrive and anchor the carcass: one holds, another rolls.",
    note: "The spin comes from bending the head and tail · Fish et al. 2007" },
  { n: "VII", t: "Swallow", h: "Head back",
    p: "It lifts its head clear of the water and tosses each piece back, letting gravity do the work. Big pieces go down whole. Later it hauls out to bask, because a warmer body digests faster. One large meal can carry it for weeks.",
    note: "Stomach acid dissolves bone. Hair and hooves digest poorly" },
];

// ---------- choreography ----------
// Scene units: 1200 × 620, waterline WY. Bank on the right; crocodile faces right (toward the prey).
export const SCENE = { W: 1200, H: 620, WY: 300, L: 520, M: 520 / 4.5 }; // M = pixels per metre
export function pose(s, T = 0) {
  const { WY, L } = SCENE;
  const st = k => seg(s, k, k + 1);
  const bob = Math.sin(T * .9) * 1.4;
  const c = { x: 330, y: WY + .02 * L + bob, pitch: 0, jaw: 0, roll: 0, limbs: 0, swim: .2, eye: 1, membrane: 0, tailKick: 0 };
  const g = { x: 1150, y: 262, rot: 0, drop: 0, kick: 0, brace: 0, walk: 1, alpha: 1, sub: 0 };
  const c2 = { on: 0, x: -200, y: WY + 60, pitch: 0, jaw: 0, roll: 0 };
  const fx = { splash: 0, bubbles: 0, swirl: 0, ripple: 0 };

  // I watch: wildebeest walks down to the edge and drinks
  const a1 = ease(seg(s, 0, .8));
  g.x = lerp(1150, 1012, a1); g.y = lerp(250, 268, a1); g.walk = 1 - seg(s, .6, .85); g.drop = seg(s, .7, 1);
  fx.ripple = s > .85 && s < 3 ? 1 : 0;

  // II sink + approach underwater
  if (s >= 1) {
    const a = st(1);
    c.y = lerp(WY + .02 * L, WY + 95, ease(seg(a, 0, .35)));
    c.x = lerp(330, 700, ease(seg(a, .15, 1)));
    c.swim = 1; c.eye = 1 - seg(a, 0, .25); c.membrane = seg(a, 0, .25);
    c.pitch = Math.sin(seg(a, 0, .35) * Math.PI) * .05 - Math.sin(seg(a, .7, 1) * Math.PI) * .04;
  }
  // III hold just under the surface by the bank
  if (s >= 2) {
    const a = st(2);
    c.x = lerp(700, 780, ease(seg(a, 0, .5)));
    c.y = lerp(WY + 95, WY + .016 * L, ease(seg(a, 0, .6))) + (seg(a, .6, 1) > 0 ? bob * .3 : 0);
    c.pitch = -.03 * ease(seg(a, 0, .6)); c.swim = lerp(1, .1, seg(a, 0, .6));
    c.membrane = 1 - seg(a, .55, .75); c.eye = seg(a, .6, .8);
    g.drop = 1 - Math.max(0, Math.sin(a * Math.PI * 3)) * .65 * (1 - seg(a, .8, 1)); // nervous drinking
  }
  // IV strike
  if (s >= 3) {
    const a = st(3), lunge = easeOut(seg(a, 0, .4));
    c.x = lerp(780, 938, lunge); c.y = lerp(WY + .016 * L, WY - 6, lunge);
    c.pitch = -lerp(0, .3, lunge) * (1 - seg(a, .55, 1) * .45);
    c.jaw = seg(a, .04, .22) * (1 - seg(a, .3, .4)); c.limbs = lunge * (1 - seg(a, .6, 1)) * .8;
    c.tailKick = Math.sin(seg(a, 0, .45) * Math.PI); c.eye = 1; c.swim = 0;
    g.drop = 1; g.kick = seg(a, .3, .5); g.brace = seg(a, .32, .7);
    g.x = 1012 + 6 * Math.sin(seg(a, .3, 1) * Math.PI * 4) * seg(a, .3, .5);
    fx.splash = seg(a, .1, .5) * (1 - seg(a, .7, 1)); fx.ripple = 0;
  }
  // V drag and drown
  if (s >= 4) {
    const a = ease(st(4));
    c.x = lerp(938, 640, a); c.y = lerp(WY - 6, WY + 110, a); c.pitch = lerp(-.165, .08, a); c.jaw = 0; c.limbs = 0; c.swim = .6; c.tailKick = 0;
    c.eye = 1 - seg(a, 0, .3); c.membrane = seg(a, .1, .3);
    g.x = lerp(1012, c.x + 78, a); g.y = lerp(268, c.y + 52, a); g.rot = lerp(0, -.42, a) + Math.sin(T * 11) * .06 * (1 - a); g.drop = 1;
    c.pitch += Math.sin(T * 9) * .05 * (1 - a); // head shakes as it drags
    g.kick = 1 - seg(a, .5, 1) * .8; g.brace = 1 - a; g.sub = seg(a, .1, .5);
    fx.bubbles = seg(a, .3, .6); fx.splash = 1 - seg(a, 0, .25);
  }
  // VI death roll, second crocodile anchors
  if (s >= 5) {
    const a = st(5);
    c.x = 640 + Math.sin(a * Math.PI) * 14; c.y = WY + 110; c.pitch = .08 * (1 - a); c.roll = ease(seg(a, .1, .9)) * Math.PI * 4;
    g.x = c.x + 78 + Math.sin(a * Math.PI * 8) * 6; g.y = c.y + 48; g.rot = -.42 - Math.sin(a * Math.PI * 8) * .3; g.kick = 0; g.sub = 1; g.drop = 1;
    c2.on = ease(seg(a, .2, .9)); c2.x = lerp(-250, 450, c2.on); c2.y = WY + 150; c2.jaw = seg(a, .75, .85) * (1 - seg(a, .9, 1));
    fx.bubbles = .6; fx.swirl = Math.sin(seg(a, .05, .95) * Math.PI);
  }
  // VII swallow: surface, head tipped back
  if (s >= 6) {
    const a = ease(st(6));
    c.x = lerp(640, 660, a); c.y = lerp(WY + 110, WY + .006 * L, a); c.roll = 0;
    const tear = seg(a, .35, 1);
    c.pitch = -lerp(0, .34, seg(a, .3, .55)) + Math.sin(T * 10) * .07 * tear;          // head up, thrashing
    c.jaw = tear > 0 ? .45 + .5 * Math.abs(Math.sin(a * Math.PI * 4)) : 0;            // gaping, tearing bites
    c.eye = 1; c.membrane = 0; c.swim = .9; c.tailKick = .5 * Math.abs(Math.sin(T * 4)) * tear;
    // the drowned animal rolls belly-up and floats, legs out of the water; the crocodile tears at its flank
    const over = ease(seg(a, 0, .5)), S = 1.3 * SCENE.M;
    g.x = c.x + lerp(78, 150, over); g.y = lerp(c.y + 48, WY - .25 * S, over);
    g.rot = lerp(-.42, Math.PI * .93, over) + Math.sin(T * 10) * .04 * tear; g.sub = 1; g.drop = 1;
    fx.splash = .6 * Math.abs(Math.sin(T * 5)) * tear;
    c2.on = 1; c2.x = lerp(450, 520, a); c2.y = lerp(WY + 150, WY + 120, a);
    fx.bubbles = .2 * (1 - a); fx.swirl = 0;
  }
  return { c, g, c2, fx };
}

// ---------- year at the Mara crossing ----------
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const YEAR = [
  { k: "rain", from: 2, to: 5, label: "Long rains" },
  { k: "rain", from: 10, to: 12, label: "Short rains" },
  { k: "cross", from: 6, to: 10, label: "Herds cross the Mara" },
];
export function arc(cx, cy, r, a0, a1) {
  const p = a => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `M${f(x0)},${f(y0)}A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${f(x1)},${f(y1)}`;
}
export const monthAngle = m => -Math.PI / 2 + (m / 12) * Math.PI * 2;
