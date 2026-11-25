// Hero (sinking below the waterline): pure layout and decoration. No DOM, no clock; randomness is injected.
import { lerp, ease, seg, easeOut } from "./math.mjs";

// Silt motes: rng draws are taken in the order x, y, z, s per mote.
export function makeMotes(rng, n = 90) {
  return Array.from({ length: n }, () => ({ x: rng(), y: rng(), z: .3 + rng() * .7, s: rng() * 1000 }));
}
// Far-bank reeds: rng draws in the order x-jitter, h, b per reed.
export function makeReeds(rng, n = 160) {
  return Array.from({ length: n }, (_, i) => ({ x: i / n + rng() * .006, h: .3 + rng() * .7, b: (rng() - .5) * .5 }));
}

// Scene geometry for scroll progress p in [0,1], canvas size w x h, and time T (seconds).
export function heroLayout(p, w, h, T = 0) {
  const pe = ease(seg(p, .05, .85));
  const wy = h * lerp(.66, .2, pe);                 // the waterline climbs as we sink
  const mobile = w < 700;
  const L = mobile ? w * 2.1 : Math.min(w * 1.15, 1700);
  const sx = mobile ? w * .36 : w * .5;              // snout x
  const bob = Math.sin(T * .9) * 1.5;
  const crocTop = wy - L * .012 + bob;
  return { pe, wy, mobile, L, sx, bob, crocTop };
}

// Overlay copy opacities.
export function copyOpacity(p) {
  return {
    h1: 1 - seg(p, .18, .42),
    lede: 1 - seg(p, .12, .36),
    under: seg(p, .48, .7) * (1 - seg(p, .92, 1)),
    cue: 1 - seg(p, 0, .08),
  };
}

// Blink: returns the lid amount (0..1) and the next blink time. rng only consulted after a blink ends.
export function blinkStep(T, blinkAt, rng) {
  let blink = 0; const bt = T - blinkAt;
  if (bt > 0 && bt < .28) blink = Math.sin(bt / .28 * Math.PI);
  if (bt > .28) blinkAt = T + 3 + rng() * 5;
  return { blink, blinkAt };
}

// Measuring tape under the body. Returns null before it appears.
export function tape(p, { sx, L, w, crocTop }) {
  const mt = seg(p, .55, .85);
  if (!(mt > 0)) return null;
  const y = crocTop + L * .14, x0 = sx, x1 = sx + L * Math.min(1, (w - sx - 10) / L) * easeOut(mt);
  const ticks = [];
  for (let m = 0; m <= 4.5; m += .5) { const x = sx + (m / 4.5) * L; if (x > x1) break; ticks.push({ m, x, big: m % 1 === 0 }); }
  return { mt, y, x0, x1, ticks };
}
