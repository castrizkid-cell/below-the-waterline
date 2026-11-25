// How ranching works: a loop of five steps. Pure data + geometry.
export const STEPS = [
  { id: "nest", label: "Wild nests", color: "#8fb36a", title: "Wild nests on wild riverbanks",
    text: "Females nest on sandbanks and riverbanks, as they always have. Most eggs in the wild never become adults: floods, monitor lizards and heat take them." },
  { id: "quota", label: "Eggs collected", color: "#d9b26f", title: "Eggs collected under a quota",
    text: "Licensed collectors take a set share of eggs from wild nests each season. The quota is set from surveys, so it can rise or fall with the population." },
  { id: "farm", label: "Raised on farms", color: "#6fb3ad", title: "Raised in safety",
    text: "On farms, far more hatchlings survive than would in the river. They are raised for a few years, until their skins are a marketable size." },
  { id: "trade", label: "Legal skins", color: "#e2a83c", title: "Skins traded legally",
    text: "Under CITES Appendix II, each skin is tagged and exported with permits. Buyers can tell a legal skin from a poached one." },
  { id: "value", label: "Reason to protect", color: "#d0683f", title: "A reason to keep crocodiles",
    text: "Eggs are worth money only if wild crocodiles keep nesting. Landowners and communities gain a reason to protect wetlands instead of clearing them, and the loop closes." },
];
export const ASIDE = "In some programmes a share of farm-raised young has been released back into the wild. Ranching works best where it is tied to surveys and quotas; where it is not, it can hide illegal trade.";

// Nodes on a circle, starting at the top, clockwise. Returns [{x, y, a}].
export function ring(n, cx, cy, r) {
  return Array.from({ length: n }, (_, i) => { const a = -Math.PI / 2 + i / n * Math.PI * 2; return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, a }; });
}
// Curved arrow from node i to node i+1 along the circle, trimmed by `gap` radians at each end.
export function arcBetween(i, n, cx, cy, r, gap = .32) {
  const a0 = -Math.PI / 2 + i / n * Math.PI * 2 + gap, a1 = -Math.PI / 2 + (i + 1) / n * Math.PI * 2 - gap;
  const p = a => [Math.round((cx + Math.cos(a) * r) * 10) / 10, Math.round((cy + Math.sin(a) * r) * 10) / 10];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `M${x0},${y0}A${r},${r} 0 0 1 ${x1},${y1}`;
}
export const next = (i, n = STEPS.length) => (i + 1) % n;
export const prev = (i, n = STEPS.length) => (i - 1 + n) % n;
