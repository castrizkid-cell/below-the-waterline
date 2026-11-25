// Renders the plan-view crocodiles and the year ring for the Hunt field notes.
import { planCroc, YEAR, MONTHS, arc, monthAngle } from "./hunt-model.mjs";
import { hash01 as rnd } from "./math.mjs";

const NS = "http://www.w3.org/2000/svg";
let D = null; // document, injected by mount()
const el = (tag, attrs, parent, text) => { const n = D.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text != null) n.textContent = text; parent && parent.appendChild(n); return n; };

function crocs() {
  D.querySelectorAll("g.pc").forEach(g => {
    const n = k => parseFloat(g.dataset[k] || "0");
    const L = n("l") || 100, kh = n("kh"), kt = n("kt"), k = n("k");
    const pc = planCroc({ x: n("x"), y: n("y"), heading: n("h") * Math.PI / 180, L, legs: g.dataset.legs == null ? 1 : n("legs"),
      bend: u => k + (u < .25 ? kh * (1 - u / .25) : 0) + (u > .5 ? kt * (u - .5) * 2 : 0) });
    g.innerHTML = "";
    pc.legs.forEach(d => el("path", { d, class: "pc-leg", "stroke-width": Math.max(1.6, L * .024) }, g));
    el("path", { d: pc.d, class: "pc-body" }, g);
    pc.scutes.forEach(([x, y, a]) => el("rect", { x: x - L * .006, y: y - L * .0045, width: L * .012, height: L * .009, rx: L * .002, transform: `rotate(${a} ${x} ${y})`, class: "pc-scute" }, g));
    pc.eyes.forEach(([x, y]) => el("circle", { cx: x, cy: y, r: Math.max(1.2, L * .011), class: "pc-eye" }, g));
    el("circle", { cx: pc.nostril[0], cy: pc.nostril[1], r: Math.max(.8, L * .006), class: "pc-nos" }, g);
  });
}

function scatter() {
  const herd = D.getElementById("herd");
  if (herd) for (let i = 0; i < 46; i++) {
    const t = i / 46, x = 140 + rnd(i) * 50 + Math.sin(t * 9) * 6, y = 168 - t * 150 - rnd(i + 3) * 6;
    el("ellipse", { cx: x.toFixed(1), cy: y.toFixed(1), rx: 2.6, ry: 4.6, transform: `rotate(${(rnd(i + 5) * 30 - 15).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})`, class: "w-herd" }, herd);
  }
  const fish = (id, n, x0, y0, w, h, ang) => {
    const g = D.getElementById(id); if (!g) return;
    for (let i = 0; i < n; i++) {
      const x = x0 + rnd(i + 11) * w, y = y0 + rnd(i + 17) * h;
      el("path", { d: `M${x.toFixed(1)},${y.toFixed(1)}l6,-2.2l0,4.4z m-3,2.2l-3,-2l0,4z`, transform: `rotate(${ang + (rnd(i) - .5) * 30} ${x.toFixed(1)} ${y.toFixed(1)})`, class: "w-fish" }, g);
    }
  };
  fish("fish3", 26, 30, 60, 120, 90, 0);
  fish("fish4", 7, 238, 140, 60, 50, 200);
}

function year() {
  const svg = D.getElementById("year"); if (!svg) return;
  const c = 170, R = 128;
  el("circle", { cx: c, cy: c, r: R, class: "y-ring" }, svg);
  MONTHS.forEach((m, i) => {
    const a = monthAngle(i), a2 = monthAngle(i + .5);
    el("line", { x1: c + Math.cos(a) * (R - 6), y1: c + Math.sin(a) * (R - 6), x2: c + Math.cos(a) * (R + 6), y2: c + Math.sin(a) * (R + 6), class: "y-tick" }, svg);
    el("text", { x: c + Math.cos(a2) * (R + 22), y: c + Math.sin(a2) * (R + 22) + 4, "text-anchor": "middle", class: "y-m" }, svg, m);
  });
  YEAR.forEach(y => el("path", { d: arc(c, c, y.k === "cross" ? R : R - 18, monthAngle(y.from), monthAngle(y.to)), class: "y-" + y.k }, svg));
  el("text", { x: c, y: c - 8, "text-anchor": "middle", class: "y-c1" }, svg, "Mara River");
  el("text", { x: c, y: c + 14, "text-anchor": "middle", class: "y-c2" }, svg, "Kenya–Tanzania");
}

export function mount({ doc = globalThis.document } = {}) { D = doc; crocs(); scatter(); year(); }
