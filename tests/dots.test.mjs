import test from "node:test";
import assert from "node:assert/strict";
import { N, COLS, LOW, HIGH, DIM, TEXT, makeRank, layout, dotXY, elapsed, dotOps } from "../js/dots.mjs";
import { mount } from "../js/dots-ui.mjs";
import { mulberry32 } from "../js/rng.mjs";
import { COLORS } from "../js/dom.mjs";

test("grid is 75 x 40 and texts are set", () => {
  assert.equal(N, 3000); assert.equal(COLS, 75); assert.equal(Math.ceil(N / COLS), 40);
  assert.equal(TEXT.killed[0], "≈3,000,000"); assert.equal(TEXT.alive[0], "250–500k");
  assert.match(TEXT.alive[1], /Each dot is still 1,000 animals\.$/);
});

test("makeRank is a deterministic permutation", () => {
  const a = makeRank(N, mulberry32(5)), b = makeRank(N, mulberry32(5)), c = makeRank(N, mulberry32(6));
  assert.deepEqual(a, b); assert.notDeepEqual(a, c);
  assert.deepEqual([...a].sort((x, y) => x - y), Array.from({ length: N }, (_, i) => i));
  assert.notDeepEqual(a, Array.from({ length: N }, (_, i) => i));
});

test("shuffle is roughly unbiased: first slot spreads evenly", () => {
  const rng = mulberry32(1), counts = [0, 0, 0, 0];
  for (let t = 0; t < 4000; t++) counts[makeRank(4, rng).indexOf(0)]++;
  for (const c of counts) assert.ok(Math.abs(c - 1000) < 120, String(counts));
});

test("layout centres the grid and caps cell by the tighter side", () => {
  const L = layout(750, 600);
  assert.equal(L.rows, 40); assert.equal(L.cell, 10); assert.equal(L.r, 3.2);
  assert.equal(L.ox, 5); assert.equal(L.oy, 105);
  assert.deepEqual(dotXY(0, L), [5, 105]); assert.deepEqual(dotXY(76, L), [15, 115]); assert.deepEqual(dotXY(2999, L), [745, 495]);
  const tall = layout(300, 600); assert.equal(tall.cell, 4); assert.equal(tall.r, 1.28);
  assert.equal(layout(30, 30).r, 1); // never thinner than 1px
});

test("elapsed: seconds, or a fixed end state under reduced motion", () => {
  assert.equal(elapsed(2500, 1000, false), 1.5);
  assert.equal(elapsed(2500, 1000, true), 9);
});

test("killed dots fade in by rank", () => {
  assert.deepEqual(dotOps("killed", 0, 0, 0, COLORS), []);
  const [op] = dotOps("killed", 0, .5, 0, COLORS);
  assert.equal(op.alpha, .8); assert.equal(op.color, COLORS.bone); assert.equal(op.kind, "fill");
  assert.deepEqual(dotOps("killed", 7, .5, N - 1, COLORS), []);
  assert.equal(dotOps("killed", 7, 9, N - 1, COLORS)[0].alpha, 1);
});

test("alive: low estimate solid amber, high outlined, rest dimmed", () => {
  const lo = dotOps("alive", 0, 9, 0, COLORS);
  assert.equal(lo.length, 2); assert.equal(lo[1].color, COLORS.iris); assert.equal(lo[1].kind, "fill");
  assert.equal(lo[1].alpha, 1); assert.equal(lo[1].scale, 1); assert.equal(lo[0].alpha, 0);
  const start = dotOps("alive", 0, 0, 0, COLORS);
  assert.equal(start[0].alpha, 1); assert.equal(start[1].alpha, 0); assert.equal(start[1].scale, 1.25);
  const hi = dotOps("alive", LOW, 9, 0, COLORS);
  assert.equal(hi[1].kind, "stroke"); assert.equal(hi[1].scale, .9); assert.equal(hi[1].alpha, 1);
  assert.equal(dotOps("alive", LOW, .2, 0, COLORS)[1].alpha, 0); // outlines start .2s later
  const rest = dotOps("alive", HIGH, 9, 0, COLORS);
  assert.deepEqual(rest, [{ alpha: .1 * .9, color: DIM, kind: "fill", scale: 1 }]);
  assert.equal(dotOps("alive", HIGH, 0, 0, COLORS)[0].alpha, .9);
});

/* ---------- mount with stubs ---------- */
function fakeCtx() {
  const c = { calls: { fill: 0, stroke: 0, clear: 0 }, fills: new Set() };
  Object.assign(c, {
    setTransform() {}, clearRect() { c.calls.clear++; }, beginPath() {}, arc() {},
    fill() { c.calls.fill++; c.fills.add(c.fillStyle); }, stroke() { c.calls.stroke++; },
  });
  return c;
}
function fakeEl() {
  const cls = new Set(), l = {};
  return { textContent: "", attrs: {}, dataset: {}, cls, l,
    classList: { toggle: (c, on) => (on ? cls.add(c) : cls.delete(c)) },
    setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(t, f) { (l[t] ||= []).push(f); }, fire(t) { (l[t] || []).forEach(f => f()); } };
}
function setup({ rm = false, onScreen = true } = {}) {
  let t = 1000; const frames = [];
  const ctx = fakeCtx(), view = { top: onScreen ? 0 : 5000 };
  const wrap = { getBoundingClientRect: () => ({ top: view.top, bottom: view.top + 400 }) };
  const cv = { parentElement: wrap, width: 0, height: 0, getBoundingClientRect: () => ({ width: 600, height: 400 }), getContext: () => ctx };
  const fig = fakeEl(), cap = fakeEl();
  const btns = ["killed", "alive"].map(v => { const b = fakeEl(); b.dataset.v = v; return b; });
  const doc = {
    getElementById: id => ({ "dots-c": cv, "fig-n": fig, "fig-cap": cap })[id],
    querySelectorAll: s => (s === "#numbers .toggle .btn" ? btns : []),
  };
  const env = { innerHeight: 800, devicePixelRatio: 2, matchMedia: () => ({ matches: rm }) };
  const h = mount({ doc, env, now: () => t, raf: f => frames.push(f), rng: mulberry32(9) });
  const step = (ms = 16) => { t += ms; frames.shift()(); };
  return { h, ctx, cv, fig, cap, btns, step, view, frames, setT: v => t = v };
}

test("mount sets the caption and draws nothing at t=0 in killed mode", () => {
  const { h, ctx, cv, cap, step } = setup();
  assert.equal(cap.textContent, TEXT.killed[1]);
  assert.equal(h.mode, "killed");
  step(0);
  assert.equal(cv.width, 1200); assert.equal(cv.height, 800);
  assert.equal(ctx.calls.clear, 1); assert.equal(ctx.calls.fill, 0);
  step(1000); // k=1: alpha = 1.6 - 1.2*rank/N > 0 for every dot
  assert.equal(ctx.calls.fill, N); assert.equal(ctx.globalAlpha, 1);
});

test("rank comes from the injected rng", () => {
  assert.deepEqual(setup().h.rank, makeRank(N, mulberry32(9)));
});

test("off-screen frames skip drawing and delay the clock start", () => {
  const { ctx, step, view } = setup({ onScreen: false });
  step(5000); assert.equal(ctx.calls.clear, 0);
  view.top = 0; step(16); // first visible frame resets t0
  assert.equal(ctx.calls.fill, 0);
});

test("toggling to alive updates text, buttons and drawing", () => {
  const { h, ctx, fig, cap, btns, step } = setup();
  step(0);
  btns[1].fire("click");
  assert.equal(h.mode, "alive");
  assert.equal(fig.textContent, TEXT.alive[0]); assert.equal(cap.textContent, TEXT.alive[1]);
  assert.ok(fig.cls.has("amber"));
  assert.equal(btns[0].attrs["aria-pressed"], "false"); assert.equal(btns[1].attrs["aria-pressed"], "true");
  btns[1].fire("click"); assert.equal(h.mode, "alive"); // no-op when already active
  step(5000);
  assert.equal(ctx.calls.stroke, HIGH - LOW);
  assert.equal(ctx.calls.fill, 2 * LOW + (HIGH - LOW) + (N - HIGH));
  assert.ok(ctx.fills.has(COLORS.iris) && ctx.fills.has(DIM));
  btns[0].fire("click"); assert.ok(!fig.cls.has("amber")); assert.equal(fig.textContent, TEXT.killed[0]);
});

test("reduced motion jumps straight to the end state; stop halts the loop", () => {
  const { h, ctx, step, frames } = setup({ rm: true });
  step(0); assert.equal(ctx.calls.fill, N);
  h.stop(); step(16); assert.equal(frames.length, 0);
});
