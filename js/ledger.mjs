// The ledger: 1 dot = 1,000 crocodiles. Pure layout + text; no DOM.
// Killed 1950–1980: an estimated 3,000,000 (≈3,000 dots).
// Alive today (IUCN 2019): 250,000–500,000 → 250 certain dots + 250 "maybe" dots.
import { clamp, lerp, groupThousands } from "./math.mjs";

export const PER_DOT = 1000;
export const KILLED = 3000, ALIVE_LOW = 250, ALIVE_HIGH = 500;
export const COLORS = { killed: "#d0683f", alive: "#8fb36a", maybe: "#8fb36a", empty: "rgba(232,224,204,.08)" };
export const MODES = ["killed", "alive", "compare"];
export const TEXT = {
  killed: { big: "≈3,000,000", cap: "Nile crocodiles killed for their skins between 1950 and 1980. Belly skin was sold to the leather trade by the square inch." },
  alive: { big: "250,000–500,000", cap: "Nile crocodiles alive in the wild today, by the IUCN's 2019 estimate. Hollow dots are the uncertainty: nobody knows within a factor of two." },
  compare: { big: "6 to 12×", cap: "Six to twelve times as many Nile crocodiles were killed for skins in those thirty years as are alive today. Left: killed. Right: alive." },
};

// Grid for n dots in a box; dot pitch fixed so both fields share one scale.
export function grid(n, cols, x0, y0, pitch) {
  const out = [];
  for (let i = 0; i < n; i++) out.push([x0 + (i % cols) * pitch + pitch / 2, y0 + Math.floor(i / cols) * pitch + pitch / 2]);
  return out;
}

// Target layout for a mode inside w×h. Returns { killed:[[x,y]...], alive:[[x,y]...], pitch, r, blocks }.
export function layout(mode, w, h) {
  const gap = Math.max(16, w * .04);
  if (mode === "compare") {
    // shared pitch: killed field 60 cols × 50 rows, alive field 20 × 25, side by side
    const pitch = Math.min((w - gap) / 80, h / 50);
    const kx = 0, ax = 60 * pitch + gap, ky = (h - 50 * pitch) / 2;
    return { pitch, r: pitch * .34, killed: grid(KILLED, 60, kx, ky, pitch), alive: grid(ALIVE_HIGH, 20, ax, ky + 25 * pitch, pitch), split: ax - gap / 2 };
  }
  if (mode === "alive") {
    const pitch = Math.min(w / 25, h / 20) * .9, x0 = (w - 25 * pitch) / 2, y0 = (h - 20 * pitch) / 2;
    const alive = grid(ALIVE_HIGH, 25, x0, y0, pitch);
    return { pitch, r: pitch * .34, alive, killed: alive.map(([x, y]) => [x, y]).concat(Array(KILLED - ALIVE_HIGH).fill([w / 2, h / 2])).slice(0, KILLED) };
  }
  const cols = 75, rows = 40, pitch = Math.min(w / cols, h / rows), x0 = (w - cols * pitch) / 2, y0 = (h - rows * pitch) / 2;
  const killed = grid(KILLED, cols, x0, y0, pitch);
  return { pitch, r: pitch * .34, killed, alive: killed.slice(0, ALIVE_HIGH) };
}

// Which dots are visible in a mode, and how.
export function dotStyle(kind, i, mode) {
  if (kind === "killed") return mode === "alive" ? { a: 0 } : { a: 1, fill: COLORS.killed };
  if (mode === "killed") return { a: 0 };
  return i < ALIVE_LOW ? { a: 1, fill: COLORS.alive } : { a: 1, stroke: COLORS.maybe };
}

// Hover: which block of 100 dots (100,000 crocodiles) is under a point.
export function blockAt(points, x, y, pitch, cols) {
  for (let i = 0; i < points.length; i++) {
    const [px, py] = points[i];
    if (Math.abs(px - x) <= pitch / 2 && Math.abs(py - y) <= pitch / 2) {
      const col = i % cols, row = Math.floor(i / cols), bc = Math.floor(col / 10), br = Math.floor(row / 10);
      return { index: i, block: [bc, br], members: points.map((_, j) => j).filter(j => Math.floor((j % cols) / 10) === bc && Math.floor(Math.floor(j / cols) / 10) === br) };
    }
  }
  return null;
}
export const blockLabel = n => `${n} dots here = ${groupThousands(n * PER_DOT)} crocodiles`;

export const tween = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
export const progress = (elapsed, dur = 900) => clamp(elapsed / dur, 0, 1);
