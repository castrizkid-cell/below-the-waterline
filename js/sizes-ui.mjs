// "Twelve lengths": the measuring drawer, the balance and the heads. Wiring only; numbers live in sizes.mjs.
import { species, order, tapeLine, snapTape, PRESETS, REGION_NAME, massKg, peopleFor, beamAngle, balanceText,
  sidePath, sideDetails, personPath, headPath, headEyes, headWidth, plateScale, IDS, SKIN, topEdge, crossbands, scutes, spots, teeth, eyeAt } from "./sizes.mjs";
import { groupThousands, hash01 } from "./math.mjs";

const NS = "http://www.w3.org/2000/svg";

export function mount({ doc = globalThis.document } = {}) {
  const $ = id => doc.getElementById(id);
  const svg = $("sz-drawer"); if (!svg) return null;
  const el = (tag, attrs = {}, parent, text) => { const n = doc.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text != null) n.textContent = text; parent && parent.appendChild(n); return n; };

  // ---------------- painting: hand-coloured specimens ----------------
  let uid = 0;
  const shared = new Map();
  function defsOf(root) {
    if (shared.has(root)) return shared.get(root);
    const defs = el("defs", {}, root);
    const pat = el("pattern", { id: `szs-${++uid}`, width: 7, height: 5, patternUnits: "userSpaceOnUse" }, defs);
    el("rect", { x: .5, y: .5, width: 6, height: 4, rx: 1, class: "scale-cell" }, pat);
    const iris = el("radialGradient", { id: `szi-${uid}`, cx: .4, cy: .38, r: .7 }, defs);
    [[0, "#f2d36a"], [.55, "#b8902e"], [1, "#4f3c12"]].forEach(([o, c]) => el("stop", { offset: o, "stop-color": c }, iris));
    const fl = el("filter", { id: `szf-${uid}`, x: "-5%", y: "-30%", width: "110%", height: "180%" }, defs);
    el("feDropShadow", { dx: 0, dy: 3, stdDeviation: 2.2, "flood-color": "#3a2a12", "flood-opacity": .32 }, fl);
    const out = { defs, scales: `url(#szs-${uid})`, iris: `url(#szi-${uid})`, shadow: `url(#szf-${uid})` };
    shared.set(root, out);
    return out;
  }
  function paintSide(root, parent, id, x0, y, Lpx) {
    const k = SKIN[id], D = defsOf(root), n = ++uid, body = sidePath(x0, y, Lpx);
    const gr = el("linearGradient", { id: `szg-${n}`, x1: 0, y1: 0, x2: 0, y2: 1 }, D.defs);
    [[0, k.back], [.34, k.back], [.56, k.flank], [.74, k.flank], [.86, k.belly], [1, k.belly]].forEach(([o, c]) => el("stop", { offset: o, "stop-color": c }, gr));
    const cp = el("clipPath", { id: `szc-${n}` }, D.defs); el("path", { d: body }, cp);
    const g = el("g", { class: "specimen" }, parent);
    el("path", { d: body, fill: `url(#szg-${n})`, filter: D.shadow }, g);
    const inside = el("g", { "clip-path": `url(#szc-${n})` }, g);
    if (k.pattern === "bands") el("path", { d: crossbands(x0, y, Lpx, k.n), fill: k.band, opacity: .62 }, inside);
    if (k.pattern === "blotch") { el("path", { d: crossbands(x0, y, Lpx, k.n), fill: k.band, opacity: .28 }, inside); spots(x0, y, Lpx, "blotch", n).forEach(([cx, cy, r], i) => el("ellipse", { cx, cy, rx: r * (1.2 + hash01(i) * .9), ry: r * (.6 + hash01(i + 3) * .4), transform: `rotate(${Math.round(hash01(i + 7) * 60 - 30)} ${cx} ${cy})`, fill: k.band, opacity: .5 }, inside)); }
    scutes(x0, y, Lpx).forEach(([cx, cy, r]) => el("ellipse", { cx, cy, rx: r * 1.3, ry: r, fill: "rgba(14,12,6,.32)" }, inside));
    if (k.pattern === "speckle") spots(x0, y, Lpx, "speckle", 5).forEach(([cx, cy, r]) => el("circle", { cx, cy, r, fill: k.band, opacity: .9 }, inside));
    el("rect", { x: x0 - 2, y: y - Lpx * .06, width: Lpx + 4, height: Lpx * .13, fill: D.scales }, inside);
    el("path", { d: topEdge(x0, y, Lpx), class: "sheen" }, g);
    const dt = sideDetails(x0, y, Lpx);
    el("path", { d: dt.jaw, class: "jawline" }, g);
    el("path", { d: teeth(x0, y, Lpx), class: "tooth" }, g);
    const [ex, ey, er] = eyeAt(x0, y, Lpx);
    el("circle", { cx: ex, cy: ey, r: er * 1.45, fill: k.back }, g);
    el("circle", { cx: ex, cy: ey, r: er, fill: D.iris }, g);
    el("ellipse", { cx: ex, cy: ey, rx: er * .2, ry: er * .85, fill: "#0d0b06" }, g);
    el("circle", { cx: ex + er * .35, cy: ey - er * .35, r: er * .22, fill: "#fff8e6", opacity: .85 }, g);
    return g;
  }
  function paintHead(root, parent, id, cx, top, H, b) {
    const k = SKIN[id], D = defsOf(root), n = ++uid, d = headPath(cx, top, H, b);
    const gr = el("linearGradient", { id: `szh-${n}`, x1: 0, y1: 0, x2: 1, y2: 0 }, D.defs);
    [[0, k.flank], [.22, k.back], [.5, k.back], [.78, k.back], [1, k.flank]].forEach(([o, c]) => el("stop", { offset: o, "stop-color": c }, gr));
    const cp = el("clipPath", { id: `szhc-${n}` }, D.defs); el("path", { d }, cp);
    el("path", { d, fill: `url(#szh-${n})`, filter: D.shadow }, parent);
    const inside = el("g", { "clip-path": `url(#szhc-${n})` }, parent);
    const many = k.pattern === "speckle", count = many ? 70 : 26;
    for (let i = 0; i < count; i++) {
      const u = .08 + hash01(n * 7 + i) * .9, w = headWidth(u, b) * H, x = cx + (hash01(i * 13 + n) * 2 - 1) * w * .85, yy = top + u * H, r = H * (many ? .008 : .014) * (.6 + hash01(i * 5));
      el("circle", { cx: x.toFixed(1), cy: yy.toFixed(1), r: r.toFixed(2), fill: k.band, opacity: many ? .9 : .4 }, inside);
    }
    el("rect", { x: cx - H, y: top, width: H * 2, height: H, fill: D.scales, opacity: .6 }, inside);
    el("path", { d, class: "head-rim" }, parent);
    headEyes(cx, top, H).forEach(([x, y]) => { const r = H * .028; el("circle", { cx: x, cy: y, r: r * 1.5, fill: k.back }, parent); el("circle", { cx: x, cy: y, r, fill: D.iris }, parent); el("ellipse", { cx: x, cy: y, rx: r * .22, ry: r * .85, fill: "#0d0b06" }, parent); });
    [-1, 1].forEach(s2 => el("ellipse", { cx: cx + s2 * H * .018, cy: top + H * .035, rx: H * .011, ry: H * .007, fill: "#120f08" }, parent));
  }

  // ---------------- the drawer ----------------
  const W = 1100, X0 = 236, X1 = 1076, TOP = 64, ROW = 82, MID = 42, MAXM = 6.5;
  const sc = plateScale(X0, X1, MAXM);
  const H = TOP + ROW * (IDS.length + 1) + 18;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  // ruler
  const ruler = el("g", { class: "sz-ruler" }, svg);
  el("line", { x1: X0, x2: X1, y1: 44, y2: 44, class: "r-base" }, ruler);
  for (let i = 0; i <= MAXM * 10; i++) {
    const m = i / 10, x = sc.px(m), big = i % 10 === 0, mid = i % 5 === 0;
    el("line", { x1: x, x2: x, y1: 44, y2: 44 - (big ? 14 : mid ? 9 : 5), class: big ? "r-big" : "r-small" }, ruler);
    if (big) el("text", { x: x + 4, y: 28, class: "r-lab" }, ruler, m === 0 ? "0" : `${m} m`);
  }
  for (let m = 1; m <= 6; m++) el("line", { x1: sc.px(m), x2: sc.px(m), y1: 50, y2: H - 10, class: "r-grid" }, svg);

  const rowsG = el("g", {}, svg), rows = {};
  // reference row: a person lying down, to scale
  const you = el("g", { class: "sz-row ref", style: `transform:translateY(${TOP}px)` }, rowsG);
  el("text", { x: 0, y: MID - 4, class: "n-common" }, you, "You, lying down");
  el("text", { x: 0, y: MID + 13, class: "n-latin" }, you, "Homo sapiens · 1.75 m");
  const p0 = sc.px(0), pp = sc.perM;
  const per = personPath(p0, MID - 6, pp);
  el("path", { d: per.body, class: "ink" }, you); el("circle", { cx: per.head[0], cy: per.head[1], r: per.head[2], class: "ink" }, you);
  IDS.forEach(id => {
    const s = species(id), g = el("g", { class: "sz-row", tabindex: 0, role: "button", "aria-label": `${s.common}, up to ${s.max} metres` }, rowsG);
    el("rect", { x: 0, y: 2, width: W, height: ROW - 4, class: "hit" }, g);
    el("rect", { x: sc.px(s.typ[0]), y: 8, width: sc.px(s.typ[1]) - sc.px(s.typ[0]), height: ROW - 16, class: "typ" }, g);
    el("text", { x: 0, y: MID - 4, class: "n-common" }, g, s.common);
    el("text", { x: 0, y: MID + 13, class: "n-latin" }, g, s.latin);
    const body = el("g", { class: "body" }, g), Lpx = s.max * pp;
    paintSide(svg, body, id, X0, MID, Lpx);
    el("line", { x1: sc.px(s.max), x2: sc.px(s.max), y1: 6, y2: ROW - 6, class: "rec" }, g);
    el("text", { x: sc.px(s.max) + 6, y: 18, class: "rec-lab" }, g, `${s.max.toFixed(2)} m`);
    rows[id] = g;
  });
  // the tape
  const tape = el("g", { class: "sz-tape", tabindex: 0, role: "slider", "aria-label": "Measuring tape", "aria-valuemin": .5, "aria-valuemax": MAXM }, svg);
  const tLine = el("line", { y1: 50, y2: H - 6, class: "t-line" }, tape);
  const tTab = el("rect", { y: 2, width: 76, height: 26, rx: 2, class: "t-tab" }, tape);
  const tTxt = el("text", { y: 20, class: "t-txt", "text-anchor": "middle" }, tape);
  const readout = $("sz-read"), sentence = $("sz-sentence");
  let tapeM = 4.6;
  function setTape(m) {
    tapeM = snapTape(m); const x = sc.px(tapeM);
    tLine.setAttribute("x1", x); tLine.setAttribute("x2", x);
    tTab.setAttribute("x", x - 38); tTxt.setAttribute("x", x); tTxt.textContent = `${tapeM.toFixed(2)} m`;
    tape.setAttribute("aria-valuenow", tapeM);
    IDS.forEach(id => rows[id].classList.toggle("short", species(id).max < tapeM));
    you.classList.toggle("short", 1.75 < tapeM);
    if (readout) readout.textContent = `${tapeM.toFixed(2)} m`;
    if (sentence) sentence.textContent = tapeLine(tapeM);
    presetBtns.forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.m === tapeM)));
  }
  const toX = ev => { const r = svg.getBoundingClientRect(); return (ev.clientX - r.left) * W / r.width; };
  let dragging = false;
  svg.addEventListener("pointerdown", ev => { if (toX(ev) < X0 - 12) return; /* the name column selects rows; the ruler area moves the tape */ dragging = true; svg.setPointerCapture?.(ev.pointerId); setTape(sc.m(toX(ev))); });
  svg.addEventListener("pointermove", ev => { if (dragging) setTape(sc.m(toX(ev))); });
  svg.addEventListener("pointerup", () => { dragging = false; });
  tape.addEventListener("keydown", ev => { const d = ev.key === "ArrowRight" || ev.key === "ArrowUp" ? .05 : ev.key === "ArrowLeft" || ev.key === "ArrowDown" ? -.05 : 0; if (d) { ev.preventDefault(); setTape(tapeM + d * (ev.shiftKey ? 10 : 1)); } });
  const presetWrap = $("sz-presets"), presetBtns = [];
  PRESETS.forEach(p => { const b = doc.createElement("button"); b.type = "button"; b.className = "sz-chip"; b.dataset.m = p.m; b.textContent = `${p.label} · ${p.m} m`; b.addEventListener("click", () => setTape(p.m)); presetWrap && presetWrap.appendChild(b); presetBtns.push(b); });

  // ordering
  const sortBtns = [...doc.querySelectorAll("#sz-sort button")];
  function arrange(mode) {
    order(mode).forEach((id, i) => { rows[id].style.transform = `translateY(${TOP + ROW * (i + 1)}px)`; });
    sortBtns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.sort === mode)));
  }
  sortBtns.forEach(b => b.addEventListener("click", () => arrange(b.dataset.sort)));

  // ---------------- the species card ----------------
  const card = { name: $("sz-name"), latin: $("sz-latin"), where: $("sz-where"), typ: $("sz-typ"), max: $("sz-max"), kg: $("sz-kg"), note: $("sz-note"), fact: $("sz-fact") };
  let sel = "niloticus";
  function select(id) {
    sel = id; const s = species(id);
    IDS.forEach(k => rows[k].classList.toggle("sel", k === id));
    if (card.name) {
      card.name.textContent = s.common; card.latin.textContent = s.latin; card.where.textContent = `${REGION_NAME[s.region]} · ${s.where}`;
      card.typ.textContent = `${s.typ[0].toFixed(1)}–${s.typ[1].toFixed(1)} m`; card.max.textContent = `${s.max.toFixed(2)} m`;
      card.kg.textContent = `≈${groupThousands(Math.round(massKg(s.typ[1]) / 10) * 10)} kg`;
      card.note.textContent = s.record; card.fact.textContent = s.fact;
      const sk = SKIN[id], skinEl = $("sz-skin"), sw = $("sz-swatch");
      if (skinEl) skinEl.textContent = sk.note;
      if (sw) [sk.back, sk.flank, sk.belly, sk.band].forEach((c, i) => { const cell = sw.children[i]; if (cell) cell.style.background = c; });
    }
    people = 1; drawBalance();
    setHead(id);
  }
  IDS.forEach(id => {
    rows[id].addEventListener("click", () => select(id));
    rows[id].addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); select(id); } });
  });

  // ---------------- the balance ----------------
  const bal = $("sz-balance"), balTxt = $("sz-bal-text"), balN = $("sz-bal-n"), balFor = $("sz-bal-for");
  let people = 1;
  const PX = 280, PY = 116, ARM = 200;
  let beam, panL, panR, crocG, folk;
  if (bal) {
    bal.setAttribute("viewBox", "-20 0 600 330");
    el("path", { d: `M${PX - 30},300L${PX},${PY + 8}L${PX + 30},300Z`, class: "b-post" }, bal);
    el("line", { x1: PX - 90, x2: PX + 90, y1: 300, y2: 300, class: "b-floor" }, bal);
    beam = el("g", { class: "b-beam", style: `transform-origin:${PX}px ${PY}px` }, bal);
    el("rect", { x: PX - ARM, y: PY - 4, width: ARM * 2, height: 8, rx: 2, class: "b-bar" }, beam);
    el("circle", { cx: PX, cy: PY, r: 7, class: "b-pin" }, beam);
    const pan = x => {
      const g = el("g", { class: "b-pan", style: `transform-origin:${x}px ${PY}px` }, beam);
      el("path", { d: `M${x},${PY}L${x - 86},${PY + 120}M${x},${PY}L${x + 86},${PY + 120}`, class: "b-string" }, g);
      el("path", { d: `M${x - 104},${PY + 120}L${x + 104},${PY + 120}L${x + 86},${PY + 132}L${x - 86},${PY + 132}Z`, class: "b-tray" }, g);
      return g;
    };
    panL = pan(PX - ARM); panR = pan(PX + ARM);
    crocG = el("g", {}, panL); folk = el("g", {}, panR);
  }
  let balCroc = null;
  function drawBalance() {
    if (!bal) return;
    const s = species(sel), L = s.typ[1], a = beamAngle(L, people);
    beam.style.transform = `rotate(${-a}deg)`; panL.style.transform = panR.style.transform = `rotate(${a}deg)`;
    if (balCroc !== sel) {
      crocG.innerHTML = ""; balCroc = sel;
      const len = 200 * Math.min(1, L / 5.2), x0 = PX - ARM - len / 2;
      paintSide(bal, crocG, sel, x0, PY + 112, len);
    }
    folk.innerHTML = "";
    const per = people > 10 ? 8 : 5, size = people > 10 ? 16 : 20;
    for (let i = 0; i < people; i++) {
      const r = Math.floor(i / per), c = i % per, n = Math.min(per, people - r * per);
      const x = PX + ARM - (n - 1) * size / 2 + c * size, y = PY + 118 - r * size * 1.55;
      el("circle", { cx: x, cy: y - size * 1.05, r: size * .2, class: "person" }, folk);
      el("path", { d: `M${x - size * .3},${y}L${x - size * .22},${y - size * .8}Q${x},${y - size * .9} ${x + size * .22},${y - size * .8}L${x + size * .3},${y}Z`, class: "person" }, folk);
    }
    if (balN) balN.textContent = String(people);
    if (balFor) balFor.textContent = `a ${L.toFixed(1)} m ${s.common.toLowerCase()}`;
    if (balTxt) balTxt.textContent = balanceText(L, people);
    bal.classList.toggle("level", people === peopleFor(L));
  }
  $("sz-minus")?.addEventListener("click", () => { people = Math.max(1, people - 1); drawBalance(); });
  $("sz-plus")?.addEventListener("click", () => { people = Math.min(40, people + 1); drawBalance(); });

  // ---------------- the heads ----------------
  const heads = $("sz-heads"), over = $("sz-over"), overTxt = $("sz-over-text"), headBtns = {};
  if (heads) order("snout").forEach(id => {
    const s = species(id), b = doc.createElement("button"); b.type = "button"; b.className = "sz-head";
    const hs = doc.createElementNS(NS, "svg"); hs.setAttribute("viewBox", "0 0 80 120"); hs.setAttribute("aria-hidden", "true");
    paintHead(hs, hs, id, 40, 6, 108, s.snout);
    b.appendChild(hs); const cap = doc.createElement("span"); cap.textContent = s.common.replace(" crocodile", ""); b.appendChild(cap);
    b.addEventListener("click", () => select(id)); heads.appendChild(b); headBtns[id] = b;
  });
  if (over) over.setAttribute("viewBox", "0 0 240 300");
  function setHead(id) {
    Object.entries(headBtns).forEach(([k, b]) => b.setAttribute("aria-pressed", String(k === id)));
    if (!over) return;
    over.innerHTML = ""; shared.delete(over); const s = species(id);
    paintHead(over, over, id, 120, 12, 276, s.snout);
    el("path", { d: headPath(120, 12, 276, 1), class: "ghost" }, over);
    if (overTxt) overTxt.textContent = id === "niloticus" ? "The Nile crocodile: the reference outline." : `${s.common} over the Nile crocodile (dashed): ${s.snout > 1.05 ? "broader" : s.snout < .95 ? "narrower" : "about the same"} at the snout.`;
  }

  arrange("length"); setTape(tapeM); select(sel);
  return { setTape, select, arrange, get tape() { return tapeM; }, get people() { return people; }, addPerson: () => { people++; drawBalance(); } };
}
