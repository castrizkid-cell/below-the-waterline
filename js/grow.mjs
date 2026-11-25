// Grow: to-scale silhouette maths. Pure: no DOM, no clock. drawPerson takes the context as a parameter.
import { lerp } from "./math.mjs";

export const LEN_MIN = .3, LEN_MAX = 6;
// Rough allometry: mass (kg) from total length (m).
export const massKg = len => 4.4 * Math.pow(len, 3);
export const formatMass = kg => kg < 1 ? Math.round(kg * 1000) + " g" : kg < 10 ? kg.toFixed(1) + " kg" : Math.round(kg / 5) * 5 + " kg";
export const formatLen = len => len.toFixed(2) + " m";
export const lifeStage = len => len < .5 ? "Hatchling" : len < 1.2 ? "Juvenile" : len < 2.5 ? "Sub-adult" : len < 4.2 ? "Adult" : "Large male";
export const sliderPct = len => ((len - LEN_MIN) / (LEN_MAX - LEN_MIN) * 100) + "%";
// Diet / predator rows apply between their min and max lengths, inclusive.
export const inRange = (len, min, max) => len >= min && len <= max;
export const parseRange = dataset => ({ min: +dataset.min, max: +dataset.max });
// Everything the readout shows for a given length.
export function readout(len) {
  return { len: formatLen(len), kg: formatMass(massKg(len)), stage: lifeStage(len), pct: sliderPct(len) };
}

// Displayed length eases toward the target, frame-rate independent.
export const approach = (shown, target, dt, reduced = false) => reduced ? target : lerp(shown, target, 1 - Math.pow(.0015, dt));

// Pixels per metre and baseline so 6.9 m fits across and 2 m fits up.
export function growLayout(w, h) {
  return { ppm: Math.min((w - 40) / 6.9, (h - 30) / 2.0), base: h - 1, x0: 20 };
}
// Crocodile drawing options for a length L in px.
export const crocOpts = (L, x0, base, T) => ({ L, x: x0, y: base - L * .115, t: T, sway: .25, fill: "#c9a24a", belly: "#8c7a3f", crest: "#c9a24a", leg: "#7d6a33", eyeGlow: 0, alpha: 1 });

// 1.75 m person silhouette standing on base at x.
export function drawPerson(ctx, x, base, ppm) {
  const H = 1.75 * ppm; ctx.fillStyle = "#8f9c76";
  ctx.beginPath(); ctx.arc(x, base - H + H * .065, H * .065, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - H * .1, base - H * .84); ctx.lineTo(x + H * .1, base - H * .84); ctx.lineTo(x + H * .085, base - H * .47); ctx.lineTo(x + H * .07, base); ctx.lineTo(x + H * .02, base); ctx.lineTo(x, base - H * .42); ctx.lineTo(x - H * .02, base); ctx.lineTo(x - H * .07, base); ctx.lineTo(x - H * .085, base - H * .47); ctx.closePath(); ctx.fill();
  ctx.fillRect(x - H * .14, base - H * .83, H * .04, H * .36); ctx.fillRect(x + H * .1, base - H * .83, H * .04, H * .36);
  return H;
}
