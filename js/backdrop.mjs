// The page backdrop: crocodile dorsal armour seen through water. Pure helpers; no DOM.
import { clamp, lerp } from "./math.mjs";

// One tile of dorsal osteoderms, as an SVG mask. Rows run across the back; each plate is a
// rounded shield with a raised keel down its middle; alternate rows are offset like real armour.
export function scuteTile(w = 232, h = 84, ink = "#000") {
  // Dorsal osteoderms seen from above: wide, softly rounded plates in staggered rows, each with a
  // fine longitudinal keel and two faint pits. Drawn as hairlines so they read as texture, not icons.
  const plate = (x, y, pw, ph) =>
    `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" rx="${ph * .42}" fill="none" stroke="${ink}" stroke-width="1"/>` +
    `<path d="M${x + pw / 2} ${y + ph * .2}V${y + ph * .8}" stroke="${ink}" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>` +
    `<circle cx="${x + pw * .24}" cy="${y + ph * .52}" r="1" fill="${ink}" opacity=".45"/><circle cx="${x + pw * .76}" cy="${y + ph * .52}" r="1" fill="${ink}" opacity=".45"/>`;
  const pw = w / 4 - 7, ph = h / 2 - 7;
  let s = "";
  for (let i = 0; i < 4; i++) s += plate(i * (w / 4) + 3.5, 3.5, pw, ph);
  for (let i = -1; i < 4; i++) s += plate(i * (w / 4) + w / 8 + 3.5, h / 2 + 3.5, pw, ph);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${s}</svg>`;
}
// Full-screen SVG that fills itself with the armour as a repeating <pattern>, drawn in currentColor.
export function armourSvg(w = 232, h = 84) {
  const inner = scuteTile(w, h, "currentColor").replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><defs><pattern id="bd-armour" width="${w}" height="${h}" patternUnits="userSpaceOnUse">${inner}</pattern></defs><rect width="100%" height="100%" fill="url(#bd-armour)"/></svg>`;
}
export const dataUri = svg => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

// Which section owns the screen: the last one whose top has passed 45% of the viewport.
export function activeSection(tops, vh, line = .45) {
  let k = 0;
  tops.forEach((t, i) => { if (t < vh * line) k = i; });
  return k;
}
// Slow parallax: the armour drifts at a fraction of scroll speed, wrapped to one tile so numbers stay small.
export const drift = (scrollY, k = .12, tileH = 84) => -((scrollY * k) % tileH);
// Gentle light intensity: brightest near the surface (top of page), dimmer as you go deeper.
export const lightAt = (scrollY, pageH) => lerp(1, .55, clamp(scrollY / Math.max(1, pageH), 0, 1));
