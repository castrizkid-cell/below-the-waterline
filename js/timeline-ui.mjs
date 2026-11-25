// "2,500 years of crocodiles and people": the SVG timeline, filter chips, card and prev/next. Wiring only.
import { CATS, CAT_KEYS, EVENTS, DEFAULT_INDEX, brokenScale, axisTicks, filterEvents, neighbors, layoutLabels } from "./timeline.mjs";

const NS = "http://www.w3.org/2000/svg";
const BG = "#060c0a", BONE = "#e8e0cc", DIM = "rgba(232,224,204,.6)", FAINT = "rgba(232,224,204,.28)";

export function mount({ doc = globalThis.document } = {}) {
  const $ = id => doc.getElementById(id);
  const svg = $("tl-svg"); if (!svg) return null;
  const s = (tag, attrs = {}, parent, text) => { const n = doc.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text != null) n.textContent = text; parent && parent.appendChild(n); return n; };

  // ---------- geometry ----------
  const W = 1100, X0 = 40, X1 = 1068, ROW = 20, BAR_H = 8, DOT_R = 5.5;
  const scale = brokenScale({ x0: X0, x1: X1 });
  const labels = layoutLabels(EVENTS, scale);
  const rows = Math.max(...labels.map(l => l.row)) + 1;
  const H = 116 + (rows - 1) * ROW; // tight: top label row sits ~22px below the top edge
  const AXIS = H - 50, MARK = AXIS - 14, LABEL0 = MARK - 26;
  const rowY = r => LABEL0 - r * ROW;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("role", "group");
  svg.setAttribute("aria-label", "Timeline: 2,500 years of crocodiles and people");

  // ---------- axis ----------
  const axis = s("g", { class: "tl-axis" }, svg);
  s("line", { x1: X0, x2: scale.breakX - 7, y1: AXIS, y2: AXIS, stroke: DIM, "stroke-width": 1.2, class: "tl-axis-line" }, axis);
  s("line", { x1: scale.breakX + 7, x2: X1, y1: AXIS, y2: AXIS, stroke: DIM, "stroke-width": 1.2, class: "tl-axis-line" }, axis);
  for (const t of axisTicks(scale)) {
    if (Math.abs(t.x - scale.breakX) < 8 && t.y !== scale.brk) continue;
    const len = t.major ? 9 : 4;
    s("line", { x1: t.x, x2: t.x, y1: AXIS, y2: AXIS + len, stroke: t.major ? DIM : FAINT, "stroke-width": 1, class: t.major ? "tl-tick tl-tick-major" : "tl-tick" }, axis);
    if (t.label) s("text", { x: t.y === scale.brk ? t.x + 10 : t.x, y: AXIS + 24, fill: DIM, "text-anchor": t.y === scale.brk ? "start" : "middle", class: "tl-tick-label" }, axis, t.label);
  }
  // break marker: two slanted strokes over a gap in the axis
  const brk = s("g", { class: "tl-break" }, axis);
  [-4, 4].forEach(dx => s("line", { x1: scale.breakX + dx - 4, x2: scale.breakX + dx + 4, y1: AXIS + 8, y2: AXIS - 8, stroke: BONE, "stroke-width": 1.6, "stroke-linecap": "round" }, brk));
  s("text", { x: scale.breakX, y: AXIS + 40, fill: FAINT, "text-anchor": "middle", class: "tl-break-label" }, brk, "scale changes");
  s("text", { x: (X0 + scale.breakX) / 2, y: AXIS - 34, fill: FAINT, "text-anchor": "middle", class: "tl-era-label" }, axis, "centuries");
  s("text", { x: (scale.breakX + X1) / 2, y: H - 6, fill: FAINT, "text-anchor": "middle", class: "tl-era-label" }, axis, "decades");

  // ---------- events ----------
  const leaders = s("g", { class: "tl-leaders" }, svg);
  const marks = s("g", { class: "tl-events" }, svg);
  const items = EVENTS.map((e, i) => {
    const c = CATS[e.cat].color, L = labels[i], top = LABEL0 - L.row * ROW;
    const leader = s("line", { x1: L.ax, x2: L.ax, y1: (e.span != null ? MARK - BAR_H / 2 : AXIS - DOT_R) - 2, y2: top + 4, stroke: c, "stroke-width": 0.8, "stroke-opacity": 0.55, class: "tl-leader" }, leaders);
    const g = s("g", { class: "tl-event", tabindex: 0, role: "button", "data-i": i, "data-cat": e.cat, "aria-label": `${e.label}: ${e.title}` }, marks);
    let halo;
    if (e.span != null) {
      const x1 = scale.x(e.y), x2 = scale.x(e.span), w = Math.max(x2 - x1, BAR_H);
      halo = s("rect", { x: x1 - 5, y: MARK - BAR_H / 2 - 5, width: w + 10, height: BAR_H + 10, rx: (BAR_H + 10) / 2, fill: "none", stroke: c, "stroke-width": 1.5, opacity: 0, class: "tl-halo" }, g);
      s("rect", { x: x1, y: MARK - BAR_H / 2, width: w, height: BAR_H, rx: BAR_H / 2, fill: c, class: "tl-bar" }, g);
    } else {
      const x = scale.x(e.y);
      halo = s("circle", { cx: x, cy: AXIS, r: DOT_R + 6, fill: c, "fill-opacity": 0.18, stroke: c, "stroke-width": 1.5, opacity: 0, class: "tl-halo" }, g);
      s("circle", { cx: x, cy: AXIS, r: DOT_R, fill: c, stroke: BG, "stroke-width": 1.5, class: "tl-dot" }, g);
    }
    const label = s("text", { x: L.lx, y: top, fill: c, "text-anchor": "middle", stroke: BG, "stroke-width": 4, "paint-order": "stroke", "stroke-linejoin": "round", class: "tl-label" }, g, e.title.toUpperCase());
    return { e, i, g, halo, leader, label };
  });

  // ---------- state ----------
  const on = new Set(CAT_KEYS);
  let selected = DEFAULT_INDEX;
  const card = { year: $("tl-year"), title: $("tl-title"), text: $("tl-text"), cat: $("tl-cat") };
  const prevBtn = $("tl-prev"), nextBtn = $("tl-next");

  function render() {
    for (const it of items) {
      const vis = on.has(it.e.cat), sel = it.i === selected;
      it.g.setAttribute("class", `tl-event${sel ? " tl-selected" : ""}${vis ? "" : " tl-off"}`);
      it.g.setAttribute("opacity", vis ? 1 : 0.16);
      it.g.setAttribute("tabindex", vis ? 0 : -1);
      it.g.setAttribute("aria-pressed", sel ? "true" : "false");
      it.g.setAttribute("aria-disabled", vis ? "false" : "true");
      it.halo.setAttribute("opacity", sel ? 1 : 0);
      it.leader.setAttribute("stroke-opacity", vis ? (sel ? 1 : 0.55) : 0.12);
      it.leader.setAttribute("class", `tl-leader${sel ? " tl-selected" : ""}${vis ? "" : " tl-off"}`);
    }
    const e = EVENTS[selected], c = CATS[e.cat];
    if (card.year) card.year.textContent = e.label;
    if (card.title) card.title.textContent = e.title;
    if (card.text) card.text.textContent = e.text;
    if (card.cat) {
      card.cat.textContent = c.label;
      card.cat.setAttribute("data-cat", e.cat);
      card.cat.style.setProperty("--tl-color", c.color);
      card.cat.style.background = c.color;
      card.cat.style.color = BG;
    }
    const n = neighbors(selected, on);
    if (prevBtn) prevBtn.disabled = n.prev == null;
    if (nextBtn) nextBtn.disabled = n.next == null;
    chips.forEach(({ key, btn }) => { const p = on.has(key); btn.setAttribute("aria-pressed", p ? "true" : "false"); btn.setAttribute("class", `tl-chip${p ? "" : " tl-chip-off"}`); });
  }
  function select(i, focus = false) {
    if (i == null || i < 0 || i >= EVENTS.length || !on.has(EVENTS[i].cat)) return false;
    selected = i; render();
    if (focus && items[i].g.focus) items[i].g.focus();
    return true;
  }
  const step = (dir, focus) => { const n = neighbors(selected, on); select(dir < 0 ? n.prev : n.next, focus); };

  // ---------- filter chips ----------
  const filters = $("tl-filters");
  const chips = filters ? CAT_KEYS.map(key => {
    const c = CATS[key], btn = doc.createElement("button");
    btn.setAttribute("type", "button");
    btn.setAttribute("data-cat", key);
    btn.style.setProperty("--tl-color", c.color);
    btn.style.borderColor = c.color;
    const sw = doc.createElement("span"); sw.setAttribute("class", "tl-chip-dot"); sw.setAttribute("aria-hidden", "true"); sw.style.background = c.color;
    btn.appendChild(sw);
    const tx = doc.createElement("span"); tx.textContent = c.label; btn.appendChild(tx);
    btn.addEventListener("click", () => {
      on.has(key) ? on.delete(key) : on.add(key);
      if (!on.has(EVENTS[selected].cat)) { const n = neighbors(selected, on), j = n.next ?? n.prev; if (j != null) selected = j; }
      render();
    });
    filters.appendChild(btn);
    return { key, btn };
  }) : [];

  // ---------- events: hover, click, keyboard ----------
  for (const it of items) {
    const pick = () => select(it.i);
    it.g.addEventListener("mouseenter", pick);
    it.g.addEventListener("click", pick);
    it.g.addEventListener("focus", pick);
    it.g.addEventListener("keydown", ev => {
      const k = ev.key;
      if (k === "ArrowRight" || k === "ArrowDown") { ev.preventDefault(); step(1, true); }
      else if (k === "ArrowLeft" || k === "ArrowUp") { ev.preventDefault(); step(-1, true); }
      else if (k === "Home" || k === "End") { ev.preventDefault(); const v = filterEvents(on); if (v.length) select(v[k === "Home" ? 0 : v.length - 1].i, true); }
      else if (k === "Enter" || k === " ") { ev.preventDefault(); pick(); }
    });
  }
  prevBtn && prevBtn.addEventListener("click", () => step(-1));
  nextBtn && nextBtn.addEventListener("click", () => step(1));

  render();
  return { select, get selected() { return selected; }, get visible() { return filterEvents(on).map(e => e.i); }, rows, height: H };
}
