// Night spotlight survey model (pure). Crocodiles live in normalised river coords (x 0..1 across, y 0..1 down).
// Time t is in seconds and is always passed in; randomness comes from a seeded mulberry32.
import { mulberry32, range } from "./rng.mjs";
import { clamp } from "./math.mjs";

export const RIVER = { top: 0.2, bottom: 0.95, left: 0.04, right: 0.96 };
export const BEAM_R = 0.12; // spotlight radius as a fraction of the width
export const HIT_R = 0.035; // how close a click must be to an eye pair (fraction of width)

// n crocodiles with size (m), heading (-1 left, 1 right) and a dive cycle.
// Each cycle is `period` seconds long; the animal is surfaced for the first `duty` of it.
export function makeRiver(seed, n = 48) {
  const rng = mulberry32(seed), crocs = [];
  for (let i = 0; i < n; i++) {
    crocs.push({
      id: i,
      x: range(RIVER.left, RIVER.right, rng),
      y: range(RIVER.top, RIVER.bottom, rng),
      size: range(1.5, 5, rng),
      heading: rng() < 0.5 ? -1 : 1,
      period: range(8, 15, rng), // dives last period * (1 - duty): about 2.4 to 6.8 s
      duty: range(0.55, 0.7, rng),
      phase: rng(),
    });
  }
  return crocs;
}

const cyclePos = (croc, t) => { const u = t / croc.period + croc.phase; return u - Math.floor(u); };
export const surfacedAt = (croc, t) => cyclePos(croc, t) < croc.duty;
// Seconds since the animal last went under, or null while it is surfaced.
export function diveAge(croc, t) {
  const u = cyclePos(croc, t);
  return u < croc.duty ? null : (u - croc.duty) * croc.period;
}

// Distance in width units; aspect = canvas height / width so the beam stays round on screen.
const dist = (a, b, aspect = 1) => Math.hypot(a.x - b.x, (a.y - b.y) * aspect);
export const inBeam = (croc, beam, aspect = 1) => dist(croc, beam, aspect) <= beam.r;
// 1 at the centre of the beam, 0 at its edge (how brightly the eyes shine back).
export const beamStrength = (croc, beam, aspect = 1) => clamp(1 - dist(croc, beam, aspect) / beam.r, 0, 1);

const has = (counted, id) => (counted instanceof Set ? counted.has(id) : counted.includes(id));
const countable = (c, beam, t, counted, aspect) => surfacedAt(c, t) && inBeam(c, beam, aspect) && !has(counted, c.id);

// The surfaced, lit, uncounted crocodile closest to the beam centre, or null.
export function nearestCountable(crocs, beam, t, counted = [], aspect = 1) {
  let best = null, bd = Infinity;
  for (const c of crocs) {
    if (!countable(c, beam, t, counted, aspect)) continue;
    const d = dist(c, beam, aspect);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

export function makeSurvey(seed, n = 48, { aspect = 7 / 16 } = {}) {
  return { seed, crocs: makeRiver(seed, n), counted: [], beam: { x: 0.5, y: 0.6, r: BEAM_R }, aspect, revealed: false };
}
export const moveBeam = (state, x, y) => ({ ...state, beam: { ...state.beam, x: clamp(x, 0, 1), y: clamp(y, 0, 1) } });
export const reveal = state => ({ ...state, revealed: true });

// Count the surfaced, lit, uncounted crocodile nearest `point` (within HIT_R). Returns a new state,
// or the same state object when nothing was counted (also after the reveal).
export function countAt(state, point, t) {
  if (state.revealed) return state;
  let best = null, bd = HIT_R;
  for (const c of state.crocs) {
    if (!countable(c, state.beam, t, state.counted, state.aspect)) continue;
    const d = dist(c, point, state.aspect);
    if (d <= bd) { bd = d; best = c; }
  }
  return best ? { ...state, counted: [...state.counted, best.id] } : state;
}
// Count the one nearest the beam centre (keyboard Enter).
export function countNearest(state, t) {
  if (state.revealed) return state;
  const c = nearestCountable(state.crocs, state.beam, t, state.counted, state.aspect);
  return c ? { ...state, counted: [...state.counted, c.id] } : state;
}

export function summary(state) {
  const total = state.crocs.length, counted = state.counted.length, missed = total - counted;
  const pct = total ? Math.round((counted / total) * 100) : 0;
  let message;
  if (missed === 0) message = `You counted all ${total}. Real surveys rarely manage that: some animals are always underwater or out of the light.`;
  else {
    const lead = counted === 0 ? `You counted none of ${total}.` : `You counted ${counted} of ${total}.`;
    const rest = missed === 1 ? "The 1 you missed was underwater, out of the light, or counted by nobody." : `The ${missed} you missed were underwater, out of the light, or counted by nobody.`;
    message = `${lead} ${rest} This is why a night count is treated as a minimum, not a total.`;
  }
  return { counted, total, missed, pct, message };
}

// Pixel offsets for drawing an eye pair and nostril at canvas width w.
// Spacing grows with body size (eye-to-nostril distance is how counters judge length) and shrinks with distance (small y).
export function eyeLayout(croc, w) {
  const depth = 0.55 + 0.45 * croc.y;
  const gap = w * 0.0034 * croc.size * depth; // between the two eyes (drawn slightly larger than life so they read on screen)
  const eye = Math.max(1.8, gap * 0.24);
  return { gap, eye, nostril: { dx: croc.heading * gap * 1.7, dy: gap * 0.25 }, body: w * 0.013 * croc.size * depth };
}
