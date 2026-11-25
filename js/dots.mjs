// Numbers dot field: 3,000 dots (1,000 crocodiles each), killed vs alive. Pure: no DOM, no globals.
import { clamp } from "./math.mjs";
import { shuffle } from "./rng.mjs";

export const N = 3000, COLS = 75; // 75 x 40
export const LOW = 250, HIGH = 500; // alive today, in dots
export const DIM = "#3a3f36";
export const TEXT = {
  killed: ["≈3,000,000", "Nile crocodiles killed for their hides across Africa in roughly thirty years. Belly skin was sold to the leather trade by the square inch."],
  alive: ["250–500k", "Estimated Nile crocodiles in the wild today. Solid amber is the low estimate and outlined dots reach the high one. Each dot is still 1,000 animals."]
};

// rank[i] = position of dot i in a random reveal order.
export function makeRank(n, rng) {
  const order = shuffle(Array.from({ length: n }, (_, i) => i), rng);
  const rank = new Array(n); order.forEach((v, k) => rank[v] = k);
  return rank;
}

export function layout(w, h, n = N, cols = COLS) {
  const rows = Math.ceil(n / cols), cell = Math.min(w / cols, h / rows), r = Math.max(1, cell * .32);
  return { rows, cell, r, ox: (w - cell * cols) / 2 + cell / 2, oy: (h - cell * rows) / 2 + cell / 2 };
}
export const dotXY = (i, L, cols = COLS) => [L.ox + (i % cols) * L.cell, L.oy + Math.floor(i / cols) * L.cell];

// Seconds since the mode changed; reduced motion jumps to the end state.
export const elapsed = (now, t0, rm) => (rm ? 9 : (now - t0) / 1000);

// Draw ops for dot i at time k (seconds). Each op: { alpha, color, kind: "fill"|"stroke", scale }.
export function dotOps(mode, i, k, rankI, colors, n = N) {
  if (mode === "killed") {
    const a = clamp(k * 1.6 - rankI / n * 1.2, 0, 1);
    return a <= 0 ? [] : [{ alpha: a, color: colors.bone, kind: "fill", scale: 1 }];
  }
  const fadeOut = clamp(1 - k * 1.5, .1, 1);
  if (i < LOW) {
    const a = clamp(k * 2 - i / LOW * .6, 0, 1);
    return [{ alpha: fadeOut * (1 - a), color: colors.bone, kind: "fill", scale: 1 },
            { alpha: a, color: colors.iris, kind: "fill", scale: 1 + .25 * (1 - a) }];
  }
  if (i < HIGH) {
    const a = clamp(k * 2 - .4 - (i - LOW) / (HIGH - LOW) * .6, 0, 1);
    return [{ alpha: fadeOut * (1 - a), color: colors.bone, kind: "fill", scale: 1 },
            { alpha: a, color: colors.iris, kind: "stroke", scale: .9 }];
  }
  return [{ alpha: fadeOut * .9, color: DIM, kind: "fill", scale: 1 }];
}
