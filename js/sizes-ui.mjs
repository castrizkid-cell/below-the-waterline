// "Twelve lengths": the measuring drawer, the balance and the heads. Wiring only; numbers live in sizes.mjs.
import { species, order, tapeLine, snapTape, PRESETS, REGION_NAME, massKg, peopleFor, beamAngle, balanceText,
  sidePath, sideDetails, personPath, headPath, headEyes, plateScale, IDS } from "./sizes.mjs";
import { groupThousands } from "./math.mjs";

const NS = "http://www.w3.org/2000/svg";

export function mount({ doc = globalThis.document } = {}) {
  const $ = id => doc.getElementById(id);
  const svg = $("sz-drawer"); if (!svg) return null;
  const el = (tag, attrs = {}, parent, text) => { const n = doc.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text != null) n.textContent = text; parent && parent.appendChild(n); return n; };

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
    el("path", { d: sidePath(X0, MID, Lpx), class: "ink" }, body);
    const dt = sideDetails(X0, MID, Lpx);
    el("path", { d: dt.jaw, class: "detail" }, body); el("path", { d: dt.crest, class: "detail" }, body);
    el("circle", { cx: dt.eye[0], cy: dt.eye[1], r: dt.eyeR, class: "eye" }, body);
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
    bal.setAttribute("viewBox", "0 0 560 330");
    el("path", { d: `M${PX - 30},300L${PX},${PY + 8}L${PX + 30},300Z`, class: "b-post" }, bal);
    el("line", { x1: PX - 90, x2: PX + 90, y1: 300, y2: 300, class: "b-floor" }, bal);
    beam = el("g", { class: "b-beam", style: `transform-origin:${PX}px ${PY}px` }, bal);
    el("rect", { x: PX - ARM, y: PY - 4, width: ARM * 2, height: 8, rx: 2, class: "b-bar" }, beam);
    el("circle", { cx: PX, cy: PY, r: 7, class: "b-pin" }, beam);
    const pan = x => {
      const g = el("g", { class: "b-pan", style: `transform-origin:${x}px ${PY}px` }, beam);
      el("path", { d: `M${x},${PY}L${x - 70},${PY + 120}M${x},${PY}L${x + 70},${PY + 120}`, class: "b-string" }, g);
      el("path", { d: `M${x - 82},${PY + 120}L${x + 82},${PY + 120}L${x + 66},${PY + 132}L${x - 66},${PY + 132}Z`, class: "b-tray" }, g);
      return g;
    };
    panL = pan(PX - ARM); panR = pan(PX + ARM);
    crocG = el("g", {}, panL); folk = el("g", {}, panR);
  }
  function drawBalance() {
    if (!bal) return;
    const s = species(sel), L = s.typ[1], a = beamAngle(L, people);
    beam.style.transform = `rotate(${-a}deg)`; panL.style.transform = panR.style.transform = `rotate(${a}deg)`;
    crocG.innerHTML = ""; folk.innerHTML = "";
    const len = 165 * Math.min(1, L / 5.2), x0 = PX - ARM - len / 2;
    el("path", { d: sidePath(x0, PY + 112, len), class: "ink" }, crocG);
    const per = people > 10 ? 8 : 5, size = people > 10 ? 16 : 20;
    for (let i = 0; i < people; i++) {
      const r = Math.floor(i / per), c = i % per, n = Math.min(per, people - r * per);
      const x = PX + ARM - (n - 1) * size / 2 + c * size, y = PY + 118 - r * size * 1.55;
      el("circle", { cx: x, cy: y - size * 1.05, r: size * .2, class: "ink" }, folk);
      el("path", { d: `M${x - size * .3},${y}L${x - size * .22},${y - size * .8}Q${x},${y - size * .9} ${x + size * .22},${y - size * .8}L${x + size * .3},${y}Z`, class: "ink" }, folk);
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
    el("path", { d: headPath(40, 6, 108, s.snout), class: "ink" }, hs);
    headEyes(40, 6, 108).forEach(([x, y]) => el("circle", { cx: x, cy: y, r: 3, class: "eye" }, hs));
    b.appendChild(hs); const cap = doc.createElement("span"); cap.textContent = s.common.replace(" crocodile", ""); b.appendChild(cap);
    b.addEventListener("click", () => select(id)); heads.appendChild(b); headBtns[id] = b;
  });
  if (over) over.setAttribute("viewBox", "0 0 240 300");
  function setHead(id) {
    Object.entries(headBtns).forEach(([k, b]) => b.setAttribute("aria-pressed", String(k === id)));
    if (!over) return;
    over.innerHTML = ""; const s = species(id);
    el("path", { d: headPath(120, 12, 276, s.snout), class: "ink" }, over);
    headEyes(120, 12, 276).forEach(([x, y]) => el("circle", { cx: x, cy: y, r: 7, class: "eye" }, over));
    el("path", { d: headPath(120, 12, 276, 1), class: "ghost" }, over);
    if (overTxt) overTxt.textContent = id === "niloticus" ? "The Nile crocodile: the reference outline." : `${s.common} (ink) over the Nile crocodile (dashed): ${s.snout > 1.05 ? "broader" : s.snout < .95 ? "narrower" : "about the same"} at the snout.`;
  }

  arrange("length"); setTape(tapeM); select(sel);
  return { setTape, select, arrange, get tape() { return tapeM; }, get people() { return people; }, addPerson: () => { people++; drawBalance(); } };
}
