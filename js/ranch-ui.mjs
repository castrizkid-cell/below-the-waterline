// The ranching loop diagram.
import { STEPS, ring, arcBetween, next } from "./ranch.mjs";

const NS = "http://www.w3.org/2000/svg";

export function mount({ doc = globalThis.document } = {}) {
  const svg = doc.getElementById("rc-svg"); if (!svg) return null;
  const el = (t, a = {}, p, txt) => { const n = doc.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (txt != null) n.textContent = txt; p && p.appendChild(n); return n; };
  const card = { n: doc.getElementById("rc-n"), title: doc.getElementById("rc-title"), text: doc.getElementById("rc-text") };
  const C = 210, R = 150, N = STEPS.length;
  svg.setAttribute("viewBox", "-110 -14 640 448");
  const defs = el("defs", {}, svg);
  STEPS.forEach((s, i) => { const m = el("marker", { id: `rc-m${i}`, viewBox: "0 0 10 10", refX: 7, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto" }, defs); el("path", { d: "M0,0L10,5L0,10Z", fill: STEPS[next(i)].color }, m); });
  el("circle", { cx: C, cy: C, r: R, class: "rc-track" }, svg);
  const arcs = STEPS.map((s, i) => el("path", { d: arcBetween(i, N, C, C, R), stroke: STEPS[next(i)].color, "marker-end": `url(#rc-m${i})`, class: "rc-arc" }, svg));
  const hub = el("g", { class: "rc-hub" }, svg);
  el("text", { x: C, y: C - 6, "text-anchor": "middle", class: "rc-hub-1" }, hub, "Ranching");
  el("text", { x: C, y: C + 16, "text-anchor": "middle", class: "rc-hub-2" }, hub, "tap a step");
  const nodes = ring(N, C, C, R).map((p, i) => {
    const s = STEPS[i], g = el("g", { class: "rc-node", tabindex: 0, role: "button", "aria-label": `${i + 1}. ${s.title}` }, svg);
    el("circle", { cx: p.x, cy: p.y, r: 34, fill: s.color, class: "rc-dot" }, g);
    el("text", { x: p.x, y: p.y + 7, "text-anchor": "middle", class: "rc-num" }, g, String(i + 1));
    const lx = p.x + Math.cos(p.a) * 52, ly = p.y + Math.sin(p.a) * 52 + 4, anchor = Math.abs(Math.cos(p.a)) < .3 ? "middle" : Math.cos(p.a) > 0 ? "start" : "end";
    el("text", { x: lx, y: ly, "text-anchor": anchor, class: "rc-lab" }, g, s.label);
    return g;
  });
  let cur = 0;
  function select(i) {
    cur = i; const s = STEPS[i];
    nodes.forEach((g, k) => g.classList.toggle("on", k === i));
    arcs.forEach((a, k) => a.classList.toggle("on", k === i));
    if (card.n) { card.n.textContent = `Step ${i + 1} of ${N}`; card.n.style.color = s.color; }
    if (card.title) card.title.textContent = s.title;
    if (card.text) card.text.textContent = s.text;
  }
  nodes.forEach((g, i) => {
    g.addEventListener("click", () => select(i));
    g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(i); } if (e.key === "ArrowRight") select(next(i)); });
  });
  doc.getElementById("rc-next")?.addEventListener("click", () => select(next(cur)));
  select(0);
  return { select, get current() { return cur; } };
}
