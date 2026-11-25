// Pure data + geometry for the "Twelve lengths" section. No DOM, no globals.
// Lengths are total length in metres for adult MALES (females of every species are smaller).
// typ = the range of a typical large adult male; max = largest reliably reported.
// Sources: Manolis & Stevenson (eds) 2010, IUCN/SSC Crocodile Specialist Group Status Survey;
// Britton, crocodilian.com species accounts. Figures are rounded and vary between sources.
import { SPECIES, CROC_TREE } from "./origins.mjs";
import { sideAt, planAt, mouthAt } from "./hunt-model.mjs";
import { clamp, lerp, smooth, groupThousands, hash01 } from "./math.mjs";

export const DATA = {
  porosus:      { typ: [4.3, 5.2], max: 6.17, snout: 1.15, region: "asia",   record: "Lolong, Mindanao, measured 2011 at 6.17 m and 1,075 kg" },
  niloticus:    { typ: [3.5, 5.0], max: 5.5,  snout: 1.05, region: "africa", record: "Males over 5 m live at Lake Chamo and on the Mara" },
  acutus:       { typ: [3.0, 4.2], max: 5.0,  snout: 0.8,  region: "americas", record: "About 5 m at most; older reports of 6 m were never confirmed" },
  intermedius:  { typ: [3.5, 5.0], max: 5.2,  snout: 0.7,  region: "americas", record: "Historical claims of 6 m+ were never verified" },
  palustris:    { typ: [3.0, 4.0], max: 4.5,  snout: 1.55, region: "asia",   record: "The broadest snout of any true crocodile" },
  siamensis:    { typ: [2.5, 3.5], max: 4.0,  snout: 1.25, region: "asia",   record: "Wild adults are now rare enough that few are measured" },
  suchus:       { typ: [2.5, 3.5], max: 4.0,  snout: 1.0,  region: "africa", record: "Smaller and generally less aggressive than the Nile crocodile" },
  novaeguineae: { typ: [2.5, 3.2], max: 3.5,  snout: 0.9,  region: "australasia", record: "Freshwater swamps and lakes of the interior" },
  rhombifer:    { typ: [2.3, 3.2], max: 3.5,  snout: 1.35, region: "americas", record: "Short, deep head; long legs for a crocodile" },
  moreletii:    { typ: [2.2, 3.0], max: 3.5,  snout: 1.3,  region: "americas", record: "Most adults stay under 3 m; a few larger have been reported" },
  mindorensis:  { typ: [1.5, 2.7], max: 3.0,  snout: 1.3,  region: "asia",   record: "One of the smallest and rarest crocodiles" },
  johnstoni:    { typ: [2.3, 3.0], max: 3.0,  snout: 0.42, region: "australasia", record: "A needle snout for fish, frogs and insects" },
};
export const IDS = Object.keys(DATA);
export const REGION_ORDER = ["africa", "americas", "asia", "australasia"];
export const REGION_NAME = { africa: "Africa", americas: "The Americas", asia: "Asia", australasia: "New Guinea and Australia" };

// Reference objects for the tape, in metres.
export const PRESETS = [
  { id: "you", label: "You", m: 1.75 },
  { id: "bed", label: "A double bed", m: 2.0 },
  { id: "car", label: "A family car", m: 4.6 },
  { id: "giraffe", label: "A tall giraffe", m: 5.5 },
];

export const species = id => ({ id, ...SPECIES[id], ...DATA[id] });
export const all = () => IDS.map(species);

// ---- ordering ----
function treeOrder(node = CROC_TREE, out = []) { if (node.tip) out.push(node.id); else node.children.forEach(c => treeOrder(c, out)); return out; }
export function order(mode) {
  if (mode === "family") return treeOrder();
  if (mode === "region") return [...IDS].sort((a, b) => REGION_ORDER.indexOf(DATA[a].region) - REGION_ORDER.indexOf(DATA[b].region) || DATA[b].max - DATA[a].max);
  if (mode === "snout") return [...IDS].sort((a, b) => DATA[a].snout - DATA[b].snout);
  return [...IDS].sort((a, b) => DATA[b].max - DATA[a].max || a.localeCompare(b)); // "length"
}

// ---- the tape ----
export const reaching = m => IDS.filter(id => DATA[id].max >= m);
export function tapeLine(m) {
  const n = reaching(m).length;
  if (n === 12) return `Every species reaches ${m.toFixed(2)} m`;
  if (n === 0) return `None of them reach ${m.toFixed(2)} m`;
  return `${n} of 12 species reach ${m.toFixed(2)} m`;
}
export const snapTape = (m, lo = 0.5, hi = 6.5) => Math.round(clamp(m, lo, hi) * 20) / 20;

// ---- weight ----
// Cube law, calibrated so a 6.17 m animal weighs ≈1,035 kg (Lolong was weighed at 1,075 kg).
export const massKg = L => 4.4 * L * L * L;
export const PERSON_KG = 70;
export const peopleFor = L => Math.max(1, Math.round(massKg(L) / PERSON_KG));
// Beam angle in degrees for the balance: positive tips toward the crocodile side.
export const beamAngle = (L, people) => { if (people === peopleFor(L)) return 0; const d = massKg(L) - people * PERSON_KG; return clamp(d / (massKg(L) + people * PERSON_KG) * 40, -16, 16); };
export function balanceText(L, people) {
  const need = peopleFor(L), kg = Math.round(massKg(L) / 5) * 5;
  if (people === need) return `Level. ${need} ${need === 1 ? "person" : "people"} ≈ ${groupThousands(kg)} kg of crocodile.`;
  return people < need ? `Add people. The crocodile side is still down.` : `Too many. The people side is down.`;
}

// ---- drawing geometry (SVG path strings) ----
const f = v => Math.round(v * 10) / 10;
// Side view facing right, tail tip at x0, snout tip at x0 + Lpx, midline at y.
export function sidePath(x0, y, Lpx, n = 70) {
  const top = [], bot = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = sideAt(u), droop = u > .5 ? (u - .5) * (u - .5) * .05 : 0;
    const x = x0 + (1 - u) * Lpx;
    top.push(`${f(x)},${f(y + (p.top + droop) * Lpx)}`); bot.push(`${f(x)},${f(y + (p.bot + droop) * Lpx)}`);
  }
  return "M" + top.join("L") + "L" + bot.reverse().join("L") + "Z";
}
// Ink details for the side view: eye, jaw line, tail crest ticks.
export function sideDetails(x0, y, Lpx) {
  const X = u => x0 + (1 - u) * Lpx, Y = (u, k) => { const p = sideAt(u); return y + (p.top + (p.bot - p.top) * k) * Lpx; };
  const jaw = [];
  for (let i = 0; i <= 20; i++) { const u = i / 20 * .19; jaw.push(`${f(X(u))},${f(Y(u, mouthAt(u)))}`); }
  const crest = [];
  for (let u = .5; u < .95; u += .03) crest.push(`M${f(X(u))},${f(Y(u, 0) + 1)}l${f(-Lpx * .004)},${f(Lpx * .012)}`);
  return { eye: [f(X(.148)), f(Y(.148, .22))], eyeR: Math.max(1.2, Lpx * .006), jaw: "M" + jaw.join("L"), crest: crest.join("") };
}
// A person lying on their back, side view, feet at x0, head at x0 + 1.75 m. [x m, half-thickness m]
const PERSON = [[0, .035], [.06, .055], [.42, .05], [.5, .065], [.86, .1], [.98, .12], [1.1, .105], [1.28, .125], [1.4, .12], [1.46, .055], [1.52, .05]];
export function personPath(x0, y, perM) {
  const top = PERSON.map(([x, t]) => `${f(x0 + x * perM)},${f(y - t * perM)}`), bot = PERSON.map(([x, t]) => `${f(x0 + x * perM)},${f(y + t * perM * .7)}`).reverse();
  return { body: "M" + top.join("L") + "L" + bot.join("L") + "Z", head: [f(x0 + 1.64 * perM), f(y - .01 * perM), f(.11 * perM)] };
}
// Simple folded legs for the side view.
export function sideLegs(x0, y, Lpx) {
  const leg = (u, len) => { const x = x0 + (1 - u) * Lpx, yb = y + sideAt(u).bot * Lpx * .85; return `M${f(x - Lpx * .012)},${f(yb)}L${f(x - Lpx * .03)},${f(yb + Lpx * len)}L${f(x + Lpx * .006)},${f(yb + Lpx * len)}`; };
  return [leg(.27, .045), leg(.47, .055)];
}
// Plan view of the skull, snout up. u: 0 = snout tip, 1 = back of the jaw. Half-widths as a fraction of head length,
// shaped like a Nile crocodile's skull: rounded tip, slight bulge, a notch, then a long even taper to the back.
const SKULL = [[0, .05], [.03, .072], [.07, .084], [.12, .08], [.22, .098], [.45, .158], [.7, .218], [.84, .25], [.95, .245], [1, .2]];
const skull = u => { for (let i = 1; i < SKULL.length; i++) if (u <= SKULL[i][0]) { const [a0, w0] = SKULL[i - 1], [a1, w1] = SKULL[i]; return lerp(w0, w1, smooth((u - a0) / (a1 - a0))); } return SKULL.at(-1)[1]; };
// b = relative snout breadth (1 = Nile crocodile); it acts most at the tip and fades to nothing at the back of the skull.
export function headWidth(u, b) { u = clamp(u, 0, 1); return skull(u) * lerp(b, 1, smooth(Math.min(1, u / .9))); }
export function headPath(cx, top, H, b, n = 48) {
  const L = [], R = [];
  for (let i = 0; i <= n; i++) { const u = i / n, w = headWidth(u, b) * H, y = top + u * H; L.push(`${f(cx - w)},${f(y)}`); R.push(`${f(cx + w)},${f(y)}`); }
  return "M" + R.join("L") + "L" + L.reverse().join("L") + "Z";
}
export const headEyes = (cx, top, H) => { const u = .74, w = .1 * H; return [[f(cx - w), f(top + u * H)], [f(cx + w), f(top + u * H)]]; };

// ---- skin: each species' adult colouring, from field guides and photographs ----
// back = dorsal colour, flank, belly; band = markings; pattern = how the markings fall.
export const SKIN = {
  niloticus:    { back: "#3f4226", flank: "#6e6634", belly: "#d8c98c", band: "#1f2112", pattern: "bands", n: 11, note: "Olive-bronze above with dark crossbands on the tail; a yellow belly" },
  porosus:      { back: "#45453a", flank: "#8a7a4a", belly: "#e6dcb8", band: "#232318", pattern: "blotch", n: 9, note: "Grey-olive and tan, with dark blotches; a pale cream belly" },
  acutus:       { back: "#59603f", flank: "#8c8f60", belly: "#e2dcb8", band: "#2f3322", pattern: "bands", n: 9, note: "Paler, grey-green; faint bands that fade with age" },
  intermedius:  { back: "#8a7a4c", flank: "#b9a56b", belly: "#eee3bf", band: "#3b331f", pattern: "blotch", n: 8, note: "Light tan, with scattered dark markings" },
  palustris:    { back: "#4a4637", flank: "#6f6650", belly: "#cfc39d", band: "#2a271d", pattern: "plain", n: 0, note: "Dull grey-brown, nearly uniform in adults" },
  siamensis:    { back: "#3d4430", flank: "#5f6844", belly: "#d2c999", band: "#20251a", pattern: "blotch", n: 7, note: "Olive-green to dark grey, with darker mottling" },
  suchus:       { back: "#363a26", flank: "#5b5a33", belly: "#cdbd84", band: "#1b1d11", pattern: "bands", n: 10, note: "Darker than the Nile crocodile, with dark bands" },
  novaeguineae: { back: "#4b4632", flank: "#77704c", belly: "#d9cda3", band: "#29261b", pattern: "bands", n: 10, note: "Grey-brown with dark bands across the tail" },
  rhombifer:    { back: "#232319", flank: "#3d3a24", belly: "#d7c57f", band: "#d2b552", pattern: "speckle", n: 0, note: "Black, speckled bright yellow: the 'jewelled' crocodile" },
  moreletii:    { back: "#3b3a2c", flank: "#5d5940", belly: "#cfc297", band: "#1e1e15", pattern: "bands", n: 9, note: "Dark grey-brown with darker bands" },
  mindorensis:  { back: "#5b4c2c", flank: "#8c7642", belly: "#dccb94", band: "#2c2414", pattern: "bands", n: 8, note: "Golden-brown with dark markings" },
  johnstoni:    { back: "#6b5a38", flank: "#9b8656", belly: "#e7dcb8", band: "#352b19", pattern: "bands", n: 12, note: "Light brown with dark bands on body and tail" },
};
const sp = (u, k, x0, y, Lpx) => { const p = sideAt(u), droop = u > .5 ? (u - .5) * (u - .5) * .05 : 0; return [x0 + (1 - u) * Lpx, y + (p.top + (p.bot - p.top) * k + droop) * Lpx]; };
// Open path along the back, for the wet highlight.
export function topEdge(x0, y, Lpx, from = .02, to = .96) {
  const pts = []; for (let u = from; u <= to + 1e-9; u += .02) { const [x, yy] = sp(u, 0, x0, y, Lpx); pts.push(`${f(x)},${f(yy + .8)}`); }
  return "M" + pts.join("L");
}
// Dark crossbands across back and tail (clip to the body). Bands get bolder toward the tail.
export function crossbands(x0, y, Lpx, n, from = .3, to = .97) {
  if (!n) return "";
  let d = "";
  for (let i = 0; i < n; i++) {
    const j = hash01(i * 3.7 + n), u = lerp(from, to, (i + .5) / n) + (j - .5) * .012;
    const w = lerp(.005, .011, i / n) * (.75 + j * .5), deep = lerp(.3, .72, i / n) * (.85 + hash01(i + 9) * .3);
    const a = sp(u - w, -.2, x0, y, Lpx), b = sp(u + w * .9, -.2, x0, y, Lpx), m1 = sp(u + w * 1.15, deep * .5, x0, y, Lpx);
    const c = sp(u + w * .35, deep, x0, y, Lpx), e = sp(u - w * .55, deep * .92, x0, y, Lpx), m2 = sp(u - w * 1.2, deep * .45, x0, y, Lpx);
    d += `M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}Q${f(m1[0])},${f(m1[1])} ${f(c[0])},${f(c[1])}L${f(e[0])},${f(e[1])}Q${f(m2[0])},${f(m2[1])} ${f(a[0])},${f(a[1])}Z`;
  }
  return d;
}
// Paired rows of bony plates (osteoderms) along the back and the double tail crest: [x, y, r].
export function scutes(x0, y, Lpx) {
  const out = [];
  for (let u = .2; u < .9; u += .0135) for (const k of u < .5 ? [.03, .1] : [.02]) { const [x, yy] = sp(u, k, x0, y, Lpx); out.push([f(x), f(yy), f(Lpx * (u < .5 ? .0038 : .0032) * (1 - (u - .2) * .6))]); }
  return out;
}
// Deterministic spots inside the body: [x, y, r]. kind "speckle" = many small, "blotch" = fewer, larger.
export function spots(x0, y, Lpx, kind, seed = 1) {
  const many = kind === "speckle", n = many ? 140 : kind === "blotch" ? 70 : 0, out = [];
  for (let i = 0; i < n; i++) {
    const u = .03 + hash01(seed * 97 + i) * .93, k = .04 + hash01(seed * 31 + i * 7) * (many ? .62 : .5);
    const [x, yy] = sp(u, k, x0, y, Lpx), r = Lpx * (many ? .0028 + hash01(i * 13 + seed) * .003 : .0035 + hash01(i * 17 + seed) * .0055);
    out.push([f(x), f(yy), f(r)]);
  }
  return out;
}
// Small teeth along the jaw line, pointing down from the upper jaw (u .01–.17).
export function teeth(x0, y, Lpx) {
  let d = "";
  for (let u = .014; u < .165; u += .021) {
    const [x, yy] = sp(u, mouthAt(u), x0, y, Lpx), big = Math.abs(u - .035) < .008 || Math.abs(u - .098) < .011, h = Lpx * (big ? .0068 : .0038), w = Lpx * .0022;
    d += `M${f(x - w)},${f(yy - .4)}L${f(x)},${f(yy + h)}L${f(x + w)},${f(yy - .4)}Z`;
  }
  return d;
}
export const eyeAt = (x0, y, Lpx) => { const [x, yy] = sp(.148, .2, x0, y, Lpx); return [f(x), f(yy), Math.max(1.4, Lpx * .0065)]; };

// metres → px scale for a plate of given width
export const plateScale = (x0, x1, maxM = 6.5) => ({ px: m => x0 + m * (x1 - x0) / maxM, m: px => (px - x0) * maxM / (x1 - x0), perM: (x1 - x0) / maxM });
