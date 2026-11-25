// DOM wiring for the Range map: SVG map from geo.json, legend filter, place panel, prev/next.
import { reducedMotion } from "./dom.mjs";
import { PLACES, project, wrapIndex, coordsText, tagHTML, creditText, imgAlt, labelPos, ringDelay,
  RING_KEYFRAMES, RING_TIMING, SWAP_MS, toggleFilter, countryAttrs, countryTitle, riverClass, FALLBACK } from "./range.mjs";

const NS = "http://www.w3.org/2000/svg";

export function mount({
  doc = globalThis.document,
  env = globalThis,
  fetch = (...a) => globalThis.fetch(...a),
  setTimeout = (f, ms) => env.setTimeout(f, ms),
  url = "geo.json",
} = {}) {
  const RM = reducedMotion(env);
  const svg = doc.getElementById("map"), gl = svg.querySelector("#m-land"), gk = svg.querySelector("#m-lakes"), gr = svg.querySelector("#m-rivers"), gh = svg.querySelector("#m-hot");
  const el = (t, a, parent) => { const e = doc.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); parent && parent.appendChild(e); return e; };
  let idx = 0, filter = null;
  const imgEl = doc.getElementById("pl-img"), fig = doc.getElementById("pl-fig"), body = doc.getElementById("pl-body");
  function show(i) {
    idx = wrapIndex(i, PLACES.length); const p = PLACES[idx];
    gh.querySelectorAll(".hot").forEach((g, k) => g.classList.toggle("on", k === idx));
    body.classList.add("out");
    setTimeout(() => {
      doc.getElementById("pl-coords").textContent = coordsText(p);
      doc.getElementById("pl-name").textContent = p.n;
      doc.getElementById("pl-tag").innerHTML = tagHTML(p.s);
      doc.getElementById("pl-text").textContent = p.t;
      doc.getElementById("pl-credit").textContent = creditText(p);
      if (p.img) { fig.hidden = false; imgEl.src = p.img; imgEl.alt = imgAlt(p); } else fig.hidden = true;
      body.classList.remove("out");
    }, RM ? 0 : SWAP_MS);
  }
  doc.getElementById("pl-prev").addEventListener("click", () => show(idx - 1));
  doc.getElementById("pl-next").addEventListener("click", () => show(idx + 1));
  PLACES.forEach((p, i) => {
    const [x, y] = project(p.lon, p.lat);
    const g = el("g", { class: "hot", tabindex: "0", role: "button", "aria-label": p.n, transform: `translate(${x} ${y})` }, gh);
    el("circle", { r: 18, fill: "transparent" }, g);
    const r1 = el("circle", { class: "r", r: 6 }, g), r2 = el("circle", { class: "r", r: 6 }, g);
    el("circle", { class: "d", r: 4.5 }, g);
    const lp = labelPos(p);
    const t = el("text", { class: "t", x: lp.x, y: 4, "text-anchor": lp.anchor }, g); t.textContent = p.n;
    if (!RM) [r1, r2].forEach((r, k) => r.animate(RING_KEYFRAMES, { ...RING_TIMING, delay: ringDelay(k, i) }));
    g.addEventListener("click", () => show(i));
    g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(i); } });
  });
  const legend = [...doc.querySelectorAll("#legend button")];
  legend.forEach(b => b.addEventListener("click", () => {
    filter = toggleFilter(filter, b.dataset.s);
    legend.forEach(x => x.setAttribute("aria-pressed", String(x.dataset.s === filter)));
    svg.classList.toggle("focus", !!filter);
    gl.querySelectorAll(".land").forEach(p => p.classList.toggle("hl", p.dataset.s === filter));
  }));
  show(0);
  const ready = new Promise(res => res(fetch(url))).then(r => r.json()).then(G => {
    const frag = doc.createDocumentFragment();
    G.countries.forEach(c => { const e = el("path", countryAttrs(c), frag); el("title", {}, e).textContent = countryTitle(c); });
    gl.appendChild(frag);
    G.lakes.forEach(l => el("path", { d: l.d, class: "lake" }, gk));
    G.rivers.forEach(r => el("path", { d: r.d, class: riverClass(r) }, gr));
    return true;
  }).catch(() => { el("text", FALLBACK.attrs, gl).textContent = FALLBACK.text; return false; });
  return { show, ready, get index() { return idx; }, get filter() { return filter; } };
}
