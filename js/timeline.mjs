// "2,500 years of crocodiles and people": the events, a broken-axis scale, filters and label stacking. Pure.
import { clamp } from "./math.mjs";

export const CATS = {
  culture: { label: "Culture", color: "#d9b26f" },
  loss: { label: "Loss", color: "#d0683f" },
  protection: { label: "Protection", color: "#8fb36a" },
  science: { label: "Science", color: "#6fb3ad" },
};
export const CAT_KEYS = Object.keys(CATS);

// Years: negative = BCE. `span` = end year when the event is a range.
export const EVENTS = [
  { y: -450, label: "c. 450 BCE", cat: "culture", title: "Herodotus", text: "Herodotus describes Nile crocodiles in Egypt, including the story of a small bird that cleans their teeth. The story is repeated for two thousand years." },
  { y: -300, span: 300, label: "300 BCE – 300 CE", cat: "culture", title: "Sobek's temples", text: "Crocodiles are kept, fed and mummified by the thousand at temples of the god Sobek, at Kom Ombo and at Shedet in the Faiyum, which the Greeks called Crocodilopolis." },
  { y: 1810, label: "Early 1800s", cat: "loss", title: "Gone from the Seychelles", text: "The crocodiles of the Seychelles, far out in the Indian Ocean, are hunted out." },
  { y: 1870, label: "1800s", cat: "loss", title: "Gone from the lower Nile", text: "Hunted out of the delta and the lower Nile in Egypt. In Egypt they survive only far upstream." },
  { y: 1912, label: "Early 1900s", cat: "loss", title: "Gone from the Levant", text: "The last crocodiles of the coastal rivers of what is now Israel disappear. One river is still called the Crocodile River, Nahal Taninim." },
  { y: 1950, span: 1980, label: "1950 – 1980", cat: "loss", title: "The hide trade", text: "Commercial hunters take an estimated three million Nile crocodiles for their belly skins. Numbers collapse across much of the range." },
  { y: 1966, label: "1960s", cat: "science", title: "Lake Turkana counted", text: "Surveys at Lake Turkana count roughly 12,000 crocodiles, one of the densest populations ever recorded. Their bony skins were worthless to hide hunters." },
  { y: 1970, label: "1970", cat: "protection", title: "Lake Nasser", text: "The Aswan High Dam is completed. The reservoir behind it, Lake Nasser, becomes the last refuge of crocodiles in Egypt." },
  { y: 1975, label: "1975", cat: "protection", title: "CITES Appendix I", text: "The Nile crocodile is listed on CITES Appendix I. International commercial trade in wild crocodiles is banned." },
  { y: 1985, span: 1995, label: "1980s – 90s", cat: "protection", title: "Ranching", text: "Many national populations move to CITES Appendix II under ranching programmes. Eggs are collected from the wild under quota, raised on farms, and skins are traded legally. Landowners gain a reason to keep crocodiles and wetlands." },
  { y: 2008, label: "2008", cat: "loss", title: "Olifants River die-off", text: "Pansteatitis, a painful inflammation of body fat linked to eating rancid fish in a polluted river, kills well over a hundred crocodiles in the Olifants River gorge near Kruger." },
  { y: 2011, label: "2011", cat: "science", title: "A hidden species", text: "DNA from living animals and from temple mummies shows that the crocodiles of West and Central Africa are a separate species, Crocodylus suchus." },
  { y: 2019, label: "2019", cat: "protection", title: "Least Concern", text: "The IUCN Red List assesses the Nile crocodile as Least Concern, with an estimated 250,000 to 500,000 in the wild." },
];

// Index of the default selection: the 1950–1980 hide trade.
export const DEFAULT_INDEX = EVENTS.findIndex(e => e.title === "The hide trade");

// Broken-axis scale: [from, brk] squeezed into the first `frac` of [x0, x1], [brk, to] gets the rest.
// Returns { x(year), breakX, x0, x1, from, brk, to }. Years outside [from, to] are clamped.
export function brokenScale({ x0 = 0, x1 = 1, from = -500, brk = 1800, to = 2030, frac = 0.28 } = {}) {
  const breakX = x0 + (x1 - x0) * frac;
  const x = year => {
    const y = clamp(year, from, to);
    return y <= brk ? x0 + (breakX - x0) * (y - from) / (brk - from) : breakX + (x1 - breakX) * (y - brk) / (to - brk);
  };
  return { x, breakX, x0, x1, from, brk, to };
}

// Display text for an axis year.
export const yearText = y => (y < 0 ? `${-y} BCE` : y === 0 ? "1 CE" : String(y));

// Axis ticks: centuries before the break (major every 500 years), decades after it (major every 50).
export function axisTicks(scale) {
  const out = [];
  for (let y = Math.ceil(scale.from / 100) * 100; y < scale.brk; y += 100) {
    const major = y % 500 === 0;
    out.push({ y, x: scale.x(y), major, label: major && y !== 0 ? yearText(y) : null });
  }
  for (let y = scale.brk; y <= scale.to; y += 10) {
    const major = y % 50 === 0;
    out.push({ y, x: scale.x(y), major, label: major && y < scale.to ? yearText(y) : null });
  }
  return out;
}

// Events whose category is in `cats` (array or Set; default: all), each with its index `i` in EVENTS.
export function filterEvents(cats = CAT_KEYS, events = EVENTS) {
  const on = cats instanceof Set ? cats : new Set(cats);
  return events.map((e, i) => ({ ...e, i })).filter(e => on.has(e.cat));
}

// Previous / next visible event index around index i (i itself need not be visible). null at the ends.
export function neighbors(i, cats = CAT_KEYS, events = EVENTS) {
  const vis = filterEvents(cats, events).map(e => e.i);
  const before = vis.filter(j => j < i), after = vis.filter(j => j > i);
  return { prev: before.length ? before[before.length - 1] : null, next: after.length ? after[0] : null };
}

// Where an event's leader line meets the axis: the dot, or the middle of a range.
export const anchorYear = e => (e.span != null ? (e.y + e.span) / 2 : e.y);

// Estimated label width in px (mono, uppercase).
export const labelWidth = (text, charW = 6.6) => text.length * charW;

// Stack labels into rows so no two boxes in a row overlap (with `gap` px between them).
// Each label is centred on its anchor, then nudged inside [x0, x1]. Greedy: lowest free row wins.
// Returns [{ i, ax, lx, w, row, left, right }] in event order; the number of rows is max(row) + 1.
export function layoutLabels(events, scale, { charW = 6.6, gap = 10 } = {}) {
  const items = events.map((e, k) => {
    const i = e.i ?? k, ax = scale.x(anchorYear(e)), w = labelWidth(e.title, charW);
    const lx = clamp(ax, scale.x0 + w / 2, scale.x1 - w / 2);
    return { i, ax, lx, w, left: lx - w / 2, right: lx + w / 2, row: 0 };
  });
  const rowEnds = [];
  [...items].sort((a, b) => a.left - b.left || a.i - b.i).forEach(it => {
    let r = rowEnds.findIndex(end => it.left >= end + gap);
    if (r < 0) r = rowEnds.length;
    rowEnds[r] = it.right;
    it.row = r;
  });
  return items;
}
