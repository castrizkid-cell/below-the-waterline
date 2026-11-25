// DOM wiring for the Origins section: deep-time tree + Crocodylus cladogram.
import { SPAN, PERIODS, EXTINCTIONS, SPINE, SPECIES, CROC_TREE, scale, periodAt, formatMa, ticks, layoutBranches, layoutTree } from "./origins.mjs";

const NS = "http://www.w3.org/2000/svg";
let D = null, DEFER = null; // document + timer, injected by mount()
function el(tag, attrs = {}, parent, text) {
  const n = D.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (text != null) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
}
const fmtSpan = b => b.living
  ? `${b.first} Ma to today`
  : `${b.first}–${Math.round(b.end)} Ma · extinct`;

/* ---------------- Deep-time tree ---------------- */
function deepTree() {
  const svg = D.getElementById("og-tree");
  if (!svg) return;
  const { rows, spineRow } = layoutBranches();
  const W = 1200, X0 = 26, X1 = 948, top = 74, rowH = 30;
  const spineY = top + spineRow * rowH + 6;
  const bandY = spineY + 54, H = bandY + 48;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const x = scale(SPAN, [X0, X1]);

  // period shading + band
  const back = el("g", { class: "t-back" }, svg);
  PERIODS.forEach((p, i) => {
    const a = x(p.from), b = x(p.to);
    if (i % 2) el("rect", { x: a, y: top - 30, width: b - a, height: bandY - top + 30, class: "t-shade" }, back);
    el("rect", { x: a, y: bandY, width: b - a, height: 20, class: "t-band" + (i % 2 ? " alt" : "") }, back);
    const w = b - a, label = w > 70 ? p.name : w > 18 ? p.short : "";
    if (label) el("text", { x: (a + b) / 2, y: bandY + 14, class: "t-band-l", "text-anchor": "middle" }, back, label);
  });
  ticks(250, 0, 50).forEach(t => {
    el("line", { x1: x(t), x2: x(t), y1: bandY + 20, y2: bandY + 26, class: "t-tick" }, back);
    el("text", { x: x(t), y: bandY + 39, class: "t-tick-l", "text-anchor": "middle" }, back, t === 0 ? "0 Ma" : t);
  });

  // extinctions
  EXTINCTIONS.forEach(e => {
    const xx = x(e.at);
    el("line", { x1: xx, x2: xx, y1: top - 42, y2: bandY, class: "t-ext" }, back);
    el("text", { x: xx + 6, y: top - 46, class: "t-ext-l" }, back, `${e.name} · ${Math.round(e.at)} Ma`);
  });

  // branches
  const brG = el("g", {}, svg);
  const groups = [];
  rows.forEach(b => {
    const y = top + b.row * rowH;
    const g = el("g", { class: "br" + (b.living ? " live" : ""), tabindex: 0, role: "button", "aria-label": `${b.name}, ${fmtSpan(b)}` }, brG);
    el("rect", { x: X0 - 10, y: y - rowH / 2, width: W - X0, height: rowH, class: "hit" }, g);
    const xf = x(b.from), r = 6;
    el("path", { d: `M${xf},${spineY} V${y + r} Q${xf},${y} ${xf + r},${y}`, class: "conn" }, g);
    if (b.first < b.from) el("line", { x1: xf + r, x2: x(b.first), y1: y, y2: y, class: "ghost" }, g);
    el("line", { x1: Math.max(xf + r, x(b.first)), x2: x(b.end), y1: y, y2: y, class: "solid" }, g);
    if (b.living) {
      el("text", { x: X1 + 14, y: y + 4, class: "lab" }, g, b.short || b.name);
    } else {
      el("line", { x1: x(b.end), x2: x(b.end), y1: y - 5, y2: y + 5, class: "cap" }, g);
      el("text", { x: x(b.end) + 6, y: y + 4, class: "dag" }, g, "†");
      el("text", { x: Math.max(xf + 10, x(b.first)), y: y - 7, class: "lab" }, g, b.name);
    }
    groups.push({ g, b });
  });

  // the thread
  const sp = el("g", { class: "br spine", tabindex: 0, role: "button", "aria-label": "The line to the Nile crocodile" }, svg);
  el("rect", { x: X0 - 10, y: spineY - 16, width: W - X0, height: 32, class: "hit" }, sp);
  el("line", { x1: x(252), x2: X1, y1: spineY, y2: spineY, class: "thread" }, sp);
  SPINE.forEach((n, i) => {
    const xx = x(n.at);
    el("circle", { cx: xx, cy: spineY, r: 4.5, class: "node" }, sp);
    el("text", { x: xx, y: spineY + (i % 2 ? 34 : 21), class: "node-l", "text-anchor": i === 0 ? "start" : "middle" }, sp, n.name);
  });
  el("circle", { cx: X1, cy: spineY, r: 6, class: "tipdot" }, sp);
  el("text", { x: X1 + 14, y: spineY + 4, class: "lab nile" }, sp, "Nile crocodile");
  groups.push({ g: sp, b: null });

  // scrubber
  const scr = el("g", { class: "scrub", opacity: 0 }, svg);
  const sl = el("line", { y1: top - 30, y2: bandY, class: "scrub-l" }, scr);
  const st = el("text", { y: 14, class: "scrub-t" }, scr);
  const toSvgX = ev => { const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()).x; };
  svg.addEventListener("pointermove", ev => {
    const sx = toSvgX(ev);
    if (sx < X0 || sx > X1) { scr.setAttribute("opacity", 0); return; }
    const ma = x.invert(sx), p = periodAt(ma);
    sl.setAttribute("x1", sx); sl.setAttribute("x2", sx);
    st.setAttribute("x", sx); st.setAttribute("text-anchor", sx > X1 - 160 ? "end" : sx < X0 + 160 ? "start" : "middle");
    st.textContent = `${formatMa(ma)}${p ? " · " + p.name : ""}`;
    scr.setAttribute("opacity", 1);
  });
  svg.addEventListener("pointerleave", () => scr.setAttribute("opacity", 0));

  // card
  const card = { when: D.getElementById("ogc-when"), name: D.getElementById("ogc-name"), who: D.getElementById("ogc-who"), text: D.getElementById("ogc-text"), box: D.getElementById("og-card") };
  const THREAD = {
    when: "≈252 Ma to today · unbroken",
    name: "The line to the Nile crocodile",
    who: SPINE.map(s => s.name).join(" › ") + " › C. niloticus",
    text: "The chain of ancestors that leads, without a break, to the animal in the river. Every grey line on this tree peeled away from it at the point where that line begins. Follow them to the right and most of them stop.",
  };
  let current = null;
  const select = (item, focus) => {
    current = item;
    groups.forEach(o => o.g.classList.toggle("on", o === item));
    svg.classList.toggle("focus", !!item.b);
    const d = item.b ? { when: (item.b.first < item.b.from ? `Splits off ≈${item.b.from} Ma · fossils ` : "") + fmtSpan(item.b), name: item.b.name, who: item.b.who, text: item.b.text } : THREAD;
    card.box.classList.add("out");
    DEFER(() => {
      card.when.textContent = d.when; card.name.textContent = d.name; card.who.textContent = d.who; card.text.textContent = d.text;
      card.box.classList.remove("out");
    }, focus ? 0 : 180);
  };
  groups.forEach(o => {
    o.g.addEventListener("click", () => select(o));
    o.g.addEventListener("pointerenter", ev => { if (ev.pointerType === "mouse") select(o); });
    o.g.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); select(o); } });
  });
  select(groups.at(-1), true);
}

/* ---------------- Crocodylus cladogram ---------------- */
function clade() {
  const svg = D.getElementById("og-clade");
  if (!svg) return;
  const { tips, nodes } = layoutTree(CROC_TREE);
  const W = 900, X0 = 150, X1 = 520, top = 40, rowH = 31;
  const H = top + (tips.length - 1) * rowH + 62;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const x = scale([11, 0], [X0, X1]);
  const Y = r => top + r * rowH;
  const onPath = new Set(["croc", "atl", "niloticus"]);

  [10, 8, 6, 4, 2, 0].forEach(t => {
    el("line", { x1: x(t), x2: x(t), y1: top - 22, y2: H - 34, class: "c-grid" }, svg);
    el("text", { x: x(t), y: H - 16, class: "t-tick-l", "text-anchor": "middle" }, svg, t ? `${t} Ma` : "Today");
  });

  const root = nodes.find(n => n.id === "croc");
  el("line", { x1: x(11), x2: x(root.at), y1: Y(root.y), y2: Y(root.y), class: "c-edge hot" }, svg);
  el("text", { x: x(11) - 8, y: Y(root.y) + 4, class: "c-node-l hot", "text-anchor": "end" }, svg, "Crocodylus · ≈10 Ma");
  for (const n of nodes) {
    if (n.tip) continue;
    const ys = n.kids.map(k => Y(k.y));
    el("line", { x1: x(n.at), x2: x(n.at), y1: Math.min(...ys), y2: Math.max(...ys), class: "c-edge" }, svg);
    for (const k of n.kids) {
      const hot = onPath.has(n.id) && onPath.has(k.id);
      if (hot) el("line", { x1: x(n.at), x2: x(n.at), y1: Y(n.y), y2: Y(k.y), class: "c-edge hot" }, svg);
      el("line", { x1: x(n.at), x2: x(k.at), y1: Y(k.y), y2: Y(k.y), class: "c-edge" + (hot ? " hot" : "") }, svg);
    }
    if (n.label) {
      el("circle", { cx: x(n.at), cy: Y(n.y), r: 3.5, class: "c-node" + (onPath.has(n.id) ? " hot" : "") }, svg);
      el("text", { x: X1 - 12, y: Y(n.kids[0].y) - 9, "text-anchor": "end", class: "c-node-l" + (onPath.has(n.id) ? " hot" : "") }, svg, `${n.label} · ≈${n.at} Ma`);
    }
  }

  const card = { box: D.getElementById("og-sp"), name: D.getElementById("ogs-name"), latin: D.getElementById("ogs-latin"), where: D.getElementById("ogs-where"), len: D.getElementById("ogs-len"), bar: D.getElementById("ogs-bar"), fact: D.getElementById("ogs-fact") };
  const groups = tips.map(t => {
    const s = SPECIES[t.id], y = Y(t.y);
    const g = el("g", { class: "c-tip" + (t.id === "niloticus" ? " nile" : ""), tabindex: 0, role: "button", "aria-label": `${s.common}, ${s.latin}` }, svg);
    el("rect", { x: X1 - 4, y: y - rowH / 2, width: W - X1, height: rowH, class: "hit" }, g);
    el("circle", { cx: X1, cy: y, r: 3, class: "c-dot" }, g);
    el("text", { x: X1 + 14, y: y + 5, class: "c-com" }, g, s.common);
    el("text", { x: X1 + 210, y: y + 4, class: "c-lat" }, g, s.latin);
    return { g, id: t.id };
  });
  const select = id => {
    const s = SPECIES[id];
    groups.forEach(o => o.g.classList.toggle("on", o.id === id));
    card.box.classList.add("out");
    DEFER(() => {
      card.name.textContent = s.common; card.latin.textContent = s.latin; card.where.textContent = s.where;
      card.len.textContent = `up to ≈${s.len} m`; card.bar.style.setProperty("--w", (s.len / 6.3 * 100).toFixed(1) + "%");
      card.fact.textContent = s.fact; card.box.classList.remove("out");
    }, 160);
  };
  groups.forEach(o => {
    o.g.addEventListener("click", () => select(o.id));
    o.g.addEventListener("pointerenter", ev => { if (ev.pointerType === "mouse") select(o.id); });
    o.g.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); select(o.id); } });
  });
  select("niloticus");
}

export function mount({ doc = globalThis.document, defer = (f, ms) => setTimeout(f, ms) } = {}) { D = doc; DEFER = defer; deepTree(); clade(); }
