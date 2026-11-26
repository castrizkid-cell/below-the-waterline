// The hunt film: a 66-second keyframed timeline. Pure: given a time, returns the whole scene state.
// World units are metres. x runs left → right; y = 0 is the still water surface, positive is DOWN.
import { clamp, lerp } from "./math.mjs";
import { crocFrame, pinMuzzle } from "./film-anatomy.mjs";

export const DURATION = 66;
export const CROC_L = 4.5;          // total length, m
export const GNU_H = 1.32;          // wildebeest shoulder height, m
export const EDGE_X = 21.5;         // where the bank meets the water surface

// River bed and bank profile (y down). Deep river to the left, shelving bank to the right.
export function groundY(x) {
  if (x < 17.6) return 3.2 + Math.sin(x * 1.3) * .05;
  if (x < EDGE_X) { const k = (x - 17.6) / (EDGE_X - 17.6); return 3.2 * (1 - k * k * (3 - 2 * k)) * .8 + 3.2 * (1 - k) * .2; }
  if (x < 23.4) return lerp(0, -.62, (x - EDGE_X) / (23.4 - EDGE_X));
  return -.62 - Math.sin(x * .9) * .03;
}

// ---------- keyframe tracks ----------
const EASE = {
  inOut: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  in: t => t * t * t,
  out: t => 1 - Math.pow(1 - t, 3),
  outBack: t => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  lin: t => t,
  hold: () => 0,
};
// keys: [[t, v, ease?], ...] sorted by t; the ease on a key shapes the segment that ENDS at it.
export function track(keys) {
  return t => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1, e = "inOut"] = keys[i];
      if (t <= t1) { const [t0, v0] = keys[i - 1]; return lerp(v0, v1, EASE[e]((t - t0) / (t1 - t0))); }
    }
    return keys.at(-1)[1];
  };
}
const smooth = (t, a, b) => { const k = clamp((t - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
const pulse = (t, a, b, edge = .25) => smooth(t, a, a + edge) * (1 - smooth(t, b - edge, b));

// ---------- chapters (indices match STAGES in hunt-model.mjs) ----------
export const CHAPTERS = [
  { i: 0, t0: 0,    t1: 9,    key: "watch" },
  { i: 1, t0: 9,    t1: 19,   key: "sink" },
  { i: 2, t0: 19,   t1: 25.4, key: "hold" },
  { i: 3, t0: 25.4, t1: 28.8, key: "strike" },
  { i: 4, t0: 28.8, t1: 37,   key: "drown" },
  { i: 5, t0: 37,   t1: 45.5, key: "roll" },
  { i: 6, t0: 45.5, t1: DURATION, key: "swallow" },
];
export const chapterAt = t => CHAPTERS.find(c => t >= c.t0 && t < c.t1) || CHAPTERS.at(-1);

// Built-in slow motion around the strike: physics and particles run at this fraction of real time.
export const SLOW = [25.5, 27.3];
export const timeScale = t => lerp(1, .26, pulse(t, SLOW[0], SLOW[1], .3));

// ---------- crocodile ----------
const cx = track([[0, 7.6], [9, 7.9], [11, 8.4, "in"], [18.5, 19.3], [24.6, 20.15], [25.55, 20.2], [26.15, 21.37, "out"], [28.8, 21.15], [31.5, 19.4], [36.5, 17.9], [45.5, 17.8], [47.5, 19.3], [52, 19.72], [54.5, 19.6], [56, 18.9], [58, 18.8], [66, 16.2, "in"]]);
const cy = track([[0, .1], [9, .1], [10.6, .95], [12, 1.25], [16, 1.2], [18.5, .7], [22, .16], [24.6, .12], [25.55, .22], [26.15, -.55, "out"], [27.2, -.4], [28.8, -.04], [31.5, .9], [36.5, 1.5], [45.5, 1.5], [47.5, .35], [52, .12], [55, .05], [58, .1], [62, .8], [66, 1.4]]);
const cpitch = track([[0, 0], [9, 0], [10, .1], [12, 0], [18.5, -.05], [22, -.02], [25.55, .06], [26.15, -.58, "out"], [27.4, -.42], [28.8, -.12], [31.5, .14], [36.5, .05], [45.5, 0], [47.5, -.06], [52, .02], [54.4, .02], [55.5, -.48], [57, -.52], [58.2, -.12], [62, .1], [66, .06]]);
const cjaw = track([[0, 0], [25.6, 0], [25.88, .97, "out"], [26.05, .97], [26.22, .04, "in"], [51, .04], [54.6, .1], [55.5, .48, "out"], [55.9, .18], [56.4, .52, "out"], [57.1, 0]]);
const croll = track([[0, 0], [37.6, 0], [45, Math.PI * 6], [66, Math.PI * 6]]);
const climbs = track([[0, 0], [25.2, 0], [25.5, .9, "out"], [26.6, .9], [27.6, 0]]);
const cswim = track([[0, .15], [10, .2], [11, 1], [18, 1], [20, .3], [24.5, .08], [25.4, 0], [28.8, .8], [36, .9], [37.5, .2], [45.5, .2], [47, .8], [51, .4], [54.5, .6], [58, .3], [62, 1]]);
const ctail = track([[0, 0], [25, 0], [25.5, -.65, "inOut"], [25.85, 1, "out"], [26.6, .3], [27.6, 0]]);

export function croc(t) {
  const grip = pulse(t, 52.2, 54.6, .35);                       // twisting tear on the carcass
  const thrash = pulse(t, 28.6, 34, .6);                         // head shakes while dragging
  const y = cy(t) + Math.sin(t * 1.1) * .012 * (1 - pulse(t, 9, 60, 1));
  return {
    x: cx(t) + Math.sin(t * 7) * .06 * grip, y,
    pitch: cpitch(t) + Math.sin(t * 9) * .07 * thrash + Math.sin(t * 8.5) * .03 * grip,
    jaw: cjaw(t), roll: (croll(t) % (Math.PI * 2)) + Math.sin(t * 6) * .5 * grip,
    limbs: climbs(t), swim: cswim(t), tailKick: ctail(t) + .5 * Math.abs(Math.sin(t * 5)) * grip,
    membrane: clamp((y - .32) / .25, 0, 1), eye: 1, chunk: t > 55.4 && t < 57.1 ? 1 : 0,
  };
}

// ---------- wildebeest ----------
// Free (walking, drinking) until the jaws close; then its muzzle is pinned to the crocodile's bite point.
const gx = track([[0, 31], [.8, 31], [6.4, 22.3, "out"]]);
export function slopePose(x) {
  const xf = x - .14, xh = x + 1.05, yf = groundY(xf), yh = groundY(xh), rot = Math.atan2(yh - yf, xh - xf);
  return { x, y: yf + .14 * Math.sin(rot), rot };
}
const BASE = t => ({ x: 0, y: 0, rot: 0, axial: 0, walk: 0, phase: t * 1.25, drop: 0, brace: 0, kick: 0, alive: 1, swish: Math.sin(t * 1.7) });
export function gnu(t, cf = crocFrame({ ...croc(t), t })) {
  const b = BASE(t);
  const startle = Math.max(pulse(t, 20.4, 21.5, .2), pulse(t, 23, 23.7, .18));
  if (t < 26) {
    const drink = smooth(t, 5.8, 7.4) * (1 - startle * .85) - .42 * smooth(t, 25.6, 26) + .025 * Math.sin(t * 5.5) * smooth(t, 7.4, 8);
    return { ...b, ...slopePose(gx(t)), walk: 1 - smooth(t, 5.6, 6.4), drop: clamp(drink, 0, 1) };
  }
  if (t < 45.5) {
    const k1 = smooth(t, 26.05, 29), k2 = smooth(t, 29, 34);
    const free = { ...b, ...slopePose(22.3), drop: .58 };
    const p = { ...b,
      drop: lerp(.58, .25, k1), brace: (1 - k1) * (t < 29 ? 1 : 0), phase: t * 1.6,
      kick: smooth(t, 26.3, 27) * (1 - smooth(t, 33, 36.5) * .9),
      rot: lerp(free.rot, -.62, k1) + lerp(0, .25, k2) + Math.sin(t * 3.1) * .06 * (1 - k2),
      axial: t > 37 ? Math.sin(cf.roll) * .9 + (1 - Math.cos(cf.roll)) * .5 : 0,
      alive: 1 - smooth(t, 34.5, 36.5) };
    const gp = cf.grip(), pinned = pinMuzzle(p, gp.x, gp.y), m = smooth(t, 26, 26.15);
    return { ...pinned, x: lerp(free.x, pinned.x, m), y: lerp(free.y, pinned.y, m) };
  }
  // released: the drowned animal floats up belly-up; the crocodile comes back to tear at it
  const prev = gnu(45.49), up = smooth(t, 45.5, 49.5), tear = pulse(t, 52.2, 54.6, .3);
  return { ...b, alive: 0, kick: 0, drop: lerp(prev.drop, 0, up), phase: 0,
    axial: lerp(prev.axial, Math.PI * .92, up), rot: lerp(prev.rot, -.04, up) + Math.sin(t * 6) * .05 * tear,
    x: lerp(prev.x, 19.95, up) + Math.sin(t * 7) * .05 * tear + Math.max(0, t - 57) * .04,
    y: lerp(prev.y, 1.07, up) + Math.sin(t * 1.3) * .025 * up };
}

// ---------- camera (centre x, y in metres; w = view width in metres) ----------
const camx = track([[0, 16], [8, 16.4], [11, 12], [14, 15], [18.5, 19], [24.5, 20.9], [26.2, 21.25], [28.8, 20.6], [33, 19.5], [37, 18.9], [45.5, 18.9], [50, 19.8], [58, 19.4], [66, 17]]);
const camy = track([[0, -.95], [8, -.9], [11, .45], [18.5, .3], [24.5, -.2], [26.2, -.42], [28.8, -.15], [33, .55], [37, .95], [45.5, .9], [48, .05], [58, -.05], [66, -.7]]);
const camw = track([[0, 27], [8, 24], [11, 13], [18.5, 12], [24.5, 8.6], [26.2, 7.4], [28.8, 9.2], [33, 11], [37, 10], [45.5, 10.2], [48, 9.2], [58, 10.5], [66, 25]]);
export function camera(t) {
  const shake = pulse(t, 25.8, 27.6, .15) * .09 + pulse(t, 28.8, 33.5, .5) * .025 + pulse(t, 38, 45, .5) * .02;
  return { x: camx(t), y: camy(t), w: camw(t), shake };
}

// ---------- one-off effects (spawned when playback crosses t) ----------
export const EVENTS = [
  { t: 9.2, type: "exhale", n: 26 },
  { t: 25.8, type: "erupt", power: 1 },
  { t: 26.2, type: "bite", power: .8 },
  { t: 28.9, type: "plunge", power: .9 },
  { t: 30.5, type: "plunge", power: .6 },
  { t: 37.7, type: "churn", power: .7 },
  { t: 49, type: "surface", power: .5 },
  { t: 52.4, type: "churn", power: .5 },
  { t: 55.6, type: "toss", power: .45 },
];
export const eventsBetween = (a, b) => EVENTS.filter(e => e.t > a && e.t <= b);
// continuous emitters: [rate per second, kind]
export function emitters(t) {
  return {
    bubbles: pulse(t, 9, 11.5, .3) * 30 + pulse(t, 28.8, 37, .6) * 22 + pulse(t, 37.5, 45, .5) * 14,
    spray: pulse(t, 28.8, 34.5, .4) * 60 + pulse(t, 52.2, 54.6, .3) * 30,
    silt: pulse(t, 37.5, 46, .8) * 40,
  };
}

// ---------- annotations: anchored callouts at moments in the film ----------
export const NOTES = [
  { t0: 1.5, t1: 7.6, at: "eye", text: "Eyes, ears, nostrils: all that shows", dx: -70, dy: -70 },
  { t0: 9.3, t1: 11.8, at: "snout", text: "It breathes out and sinks", dx: -40, dy: 80 },
  { t0: 12.2, t1: 17.4, at: "jaw", text: "Pressure sensors on the jaws feel the drinking", dx: 30, dy: 90 },
  { t0: 13.8, t1: 17.4, at: "eye", text: "Third eyelid closed", dx: -70, dy: -60 },
  { t0: 20.2, t1: 24.6, at: "eye", text: "Still, a metre from the muzzle", dx: -110, dy: -80 },
  { t0: 25.6, t1: 27.2, at: "tail", text: "One sweep of the tail", dx: -40, dy: 90 },
  { t0: 26.3, t1: 28.4, at: "snout", text: "Jaws close on the muzzle", dx: -150, dy: -70 },
  { t0: 31, t1: 35.6, at: "throat", text: "Palatal valve shut: it can't drown", dx: -120, dy: 80 },
  { t0: 38.2, t1: 44.4, at: "body", text: "Legs tucked, head and tail bent: the spin", dx: -80, dy: 110 },
  { t0: 52.3, t1: 54.4, at: "snout", text: "Grip, then twist to tear", dx: -150, dy: -80 },
  { t0: 55.4, t1: 57.6, at: "throat", text: "Head up: gravity does the swallowing", dx: -140, dy: -90 },
];
export const notesAt = t => NOTES.filter(n => t >= n.t0 && t <= n.t1).map(n => ({ ...n, a: pulse(t, n.t0, n.t1, .35) }));

// ---------- the whole frame ----------
export function frame(t) {
  t = clamp(t, 0, DURATION);
  const c = croc(t), cf = crocFrame({ ...c, t });
  return { t, chapter: chapterAt(t), croc: c, cf, gnu: gnu(t, cf), cam: camera(t), scale: timeScale(t), emit: emitters(t), notes: notesAt(t) };
}
export const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
