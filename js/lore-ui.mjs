// Lore: the claim deck, the temple mummy and the sacred ponds.
import { CLAIMS, VERDICTS, GUESSES, newQuiz, guess, next, goTo, correct, scoreLine, LAYERS, layerAt, PLACES } from "./lore.mjs";

const NS = "http://www.w3.org/2000/svg";

export function mount({ doc = globalThis.document } = {}) {
  const $ = id => doc.getElementById(id);
  if (!$("lr-card")) return null;
  const sv = (t, a = {}, p) => { const n = doc.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); p && p.appendChild(n); return n; };

  // ---------------- A · the claim deck ----------------
  let q = newQuiz();
  const card = $("lr-card"), who = $("lr-who"), claim = $("lr-claim"), num = $("lr-num"), verdictEl = $("lr-verdict"), text = $("lr-text"), scoreEl = $("lr-score"), you = $("lr-you");
  const btnWrap = $("lr-guess"), dots = $("lr-dots"), nextBtn = $("lr-next"), prevBtn = $("lr-prev");
  const btns = GUESSES.map(g => { const b = doc.createElement("button"); b.type = "button"; b.className = "lr-g"; b.dataset.g = g; b.textContent = VERDICTS[g].label; b.style.setProperty("--c", VERDICTS[g].color); b.addEventListener("click", () => { q = guess(q, g); render(); }); btnWrap && btnWrap.appendChild(b); return b; });
  const dotEls = CLAIMS.map((c, i) => { const b = doc.createElement("button"); b.type = "button"; b.className = "lr-dot"; b.setAttribute("aria-label", `Claim ${i + 1}`); b.addEventListener("click", () => { q = goTo(q, i); render(); }); dots && dots.appendChild(b); return b; });
  nextBtn?.addEventListener("click", () => { q = next(q); render(); });
  prevBtn?.addEventListener("click", () => { q = goTo(q, q.i - 1); render(); });
  function render() {
    const c = CLAIMS[q.i], v = VERDICTS[c.verdict], g = q.guesses[c.id];
    card.classList.toggle("revealed", q.revealed);
    card.style.setProperty("--v", q.revealed ? v.color : "#e8e0cc");
    num.textContent = `Claim ${String(q.i + 1).padStart(2, "0")} of ${CLAIMS.length}`;
    who.textContent = c.who; claim.textContent = `“${c.claim}”`;
    verdictEl.textContent = q.revealed ? v.label : "";
    text.textContent = q.revealed ? c.text : "";
    if (you) you.textContent = q.revealed ? (correct(q, c.id) ? "You called it." : `You said ${VERDICTS[g].label.toLowerCase()}.`) : "What's your call?";
    btns.forEach(b => { b.disabled = q.revealed; b.classList.toggle("picked", q.revealed && b.dataset.g === g); b.classList.toggle("answer", q.revealed && b.dataset.g === c.verdict); });
    dotEls.forEach((d, i) => { const id = CLAIMS[i].id, gg = q.guesses[id]; d.classList.toggle("cur", i === q.i); d.style.setProperty("--c", gg ? VERDICTS[CLAIMS[i].verdict].color : "transparent"); d.classList.toggle("wrong", !!gg && !correct(q, id)); });
    if (nextBtn) nextBtn.disabled = q.i === CLAIMS.length - 1;
    if (prevBtn) prevBtn.disabled = q.i === 0;
    if (scoreEl) scoreEl.textContent = scoreLine(q);
  }
  render();

  // ---------------- B · unwrap a temple mummy ----------------
  const svg = $("lr-mummy"), slider = $("lr-unwrap"), layName = $("lr-layer"), layText = $("lr-layer-text");
  let groups = [];
  if (svg) {
    svg.setAttribute("viewBox", "0 0 640 220");
    const defs = sv("defs", {}, svg);
    const pat = sv("pattern", { id: "lr-weave", width: 16, height: 16, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
    sv("rect", { width: 16, height: 16, fill: "#b98f57" }, pat); sv("rect", { width: 8, height: 16, fill: "#c9a46a" }, pat); sv("rect", { width: 16, height: 2, fill: "#8a6a3c", opacity: .55 }, pat);
    const body = "M40,112 C60,92 120,86 200,84 C300,80 420,82 520,94 C560,100 600,106 620,112 C600,118 560,124 520,130 C420,142 300,144 200,140 C120,138 60,132 40,112 Z";
    const clip = sv("clipPath", { id: "lr-body" }, defs); sv("path", { d: body }, clip);
    // bones (innermost)
    const g3 = sv("g", { class: "lr-l l-bones" }, svg);
    sv("path", { d: body, fill: "#2a2418" }, g3);
    sv("path", { d: "M70,112 C150,104 260,106 330,108 C420,110 520,112 600,112", stroke: "#efe6cf", "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, g3);
    for (let x = 150; x < 590; x += 13) { const h = x < 400 ? 14 : 10 - (x - 400) / 40; sv("line", { x1: x, x2: x - 3, y1: 108 - h, y2: 108 + h * .4, stroke: "#efe6cf", "stroke-width": 2.4, "stroke-linecap": "round" }, g3); }
    sv("path", { d: "M44,112 C60,100 100,98 140,100 L148,124 C110,126 64,124 44,112Z", fill: "none", stroke: "#efe6cf", "stroke-width": 3 }, g3);
    sv("circle", { cx: 118, cy: 106, r: 6, fill: "none", stroke: "#efe6cf", "stroke-width": 2 }, g3);
    [[230, 1], [380, 1]].forEach(([x]) => { sv("path", { d: `M${x},126 l-16,26 M${x + 6},126 l12,24`, stroke: "#efe6cf", "stroke-width": 3, "stroke-linecap": "round" }, g3); });
    // papyri
    const g2 = sv("g", { class: "lr-l l-papyri", "clip-path": "url(#lr-body)" }, svg);
    sv("path", { d: body, fill: "#e6d2a0" }, g2);
    for (let i = 0; i < 9; i++) { const x = 60 + i * 64; sv("rect", { x, y: 80 + (i % 3) * 6, width: 70, height: 70, fill: i % 2 ? "#dcc490" : "#ead9ad", transform: `rotate(${(i % 2 ? -6 : 5)} ${x + 35} 115)` }, g2); for (let k = 0; k < 6; k++) sv("line", { x1: x + 8, x2: x + 58 - (k % 3) * 9, y1: 92 + k * 8, y2: 92 + k * 8, stroke: "#5b4426", "stroke-width": 1.2, "stroke-dasharray": "3 2 6 2", opacity: .7 }, g2); }
    // linen
    const g1 = sv("g", { class: "lr-l l-linen" }, svg);
    sv("path", { d: body, fill: "url(#lr-weave)", stroke: "#6e5232", "stroke-width": 2 }, g1);
    for (let x = 90; x < 600; x += 46) sv("path", { d: `M${x},${88 - (x > 500 ? (x - 500) / 12 : 0)} C${x + 6},110 ${x + 6},120 ${x},${140 - (x > 500 ? (x - 500) / 10 : 0)}`, stroke: "#6e5232", "stroke-width": 2.5, fill: "none", "clip-path": "url(#lr-body)" }, g1);
    groups = [g1, g2, g3];
  }
  function unwrap(v) {
    const L = layerAt(v);
    groups.forEach((g, i) => { g.style.opacity = i < Math.round(v) ? 0 : 1; });
    if (layName) { layName.textContent = L.label; layName.style.color = L.color; }
    if (layText) layText.textContent = L.text;
  }
  slider?.addEventListener("input", () => unwrap(+slider.value));
  unwrap(0);

  // ---------------- C · sacred ponds ----------------
  const tabs = $("lr-places"), pName = $("lr-p-name"), pWhere = $("lr-p-where"), pSp = $("lr-p-sp"), pText = $("lr-p-text"), pBox = $("lr-place");
  const tabEls = PLACES.map((p, i) => { const b = doc.createElement("button"); b.type = "button"; b.className = "lr-tab"; b.style.setProperty("--c", p.color); b.innerHTML = `<b>${p.name}</b><span>${p.where}</span>`; b.addEventListener("click", () => place(i)); tabs && tabs.appendChild(b); return b; });
  function place(i) {
    const p = PLACES[i];
    tabEls.forEach((t, k) => t.setAttribute("aria-pressed", String(k === i)));
    if (pBox) pBox.style.setProperty("--c", p.color);
    if (pName) pName.textContent = p.name; if (pWhere) pWhere.textContent = p.where; if (pSp) pSp.textContent = p.species; if (pText) pText.textContent = p.text;
  }
  place(0);

  return { get quiz() { return q; }, answer: g => { q = guess(q, g); render(); }, next: () => { q = next(q); render(); }, unwrap, place };
}
