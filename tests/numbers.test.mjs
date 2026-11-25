import test from "node:test";
import assert from "node:assert/strict";
import { layout, dotStyle, blockAt, blockLabel, grid, TEXT, MODES, KILLED, ALIVE_LOW, ALIVE_HIGH, PER_DOT } from "../js/ledger.mjs";
import { STEPS, ring, arcBetween, next, prev, ASIDE } from "../js/ranch.mjs";
import { mount as mountLedger } from "../js/ledger-ui.mjs";
import { mount as mountRanch } from "../js/ranch-ui.mjs";
import { el, all, fakeDocument, fakeCanvas } from "./helpers/fake-dom.mjs";

test("ledger numbers match the sources", () => {
  assert.equal(KILLED * PER_DOT, 3_000_000);
  assert.equal(ALIVE_LOW * PER_DOT, 250_000);
  assert.equal(ALIVE_HIGH * PER_DOT, 500_000);
  assert.equal(KILLED / ALIVE_HIGH, 6); assert.equal(KILLED / ALIVE_LOW, 12);
  assert.match(TEXT.compare.big, /6 to 12/);
  for (const m of MODES) assert.ok(TEXT[m].cap.length > 40);
});

test("layouts keep every dot inside the box and share one pitch in compare", () => {
  for (const m of MODES) {
    const L = layout(m, 800, 420);
    for (const [x, y] of [...L.killed, ...L.alive]) { assert.ok(x >= 0 && x <= 800 && y >= 0 && y <= 420, `${m} ${x},${y}`); }
    assert.equal(L.killed.length, KILLED); assert.equal(L.alive.length, ALIVE_HIGH);
  }
  const c = layout("compare", 800, 420);
  assert.ok(c.alive.every(([x]) => x > c.split) && c.killed.every(([x]) => x < c.split));
});

test("dot styles: hollow dots are the uncertain half of the estimate", () => {
  assert.equal(dotStyle("killed", 0, "alive").a, 0);
  assert.ok(dotStyle("alive", 0, "alive").fill);
  assert.ok(dotStyle("alive", ALIVE_LOW, "alive").stroke && !dotStyle("alive", ALIVE_LOW, "alive").fill);
  assert.equal(dotStyle("alive", 0, "killed").a, 0);
});

test("hover finds a block of 100", () => {
  const pts = grid(3000, 75, 0, 0, 10);
  const b = blockAt(pts, 5, 5, 10, 75);
  assert.equal(b.members.length, 100);
  assert.equal(blockLabel(100), "100 dots here = 100,000 crocodiles");
  assert.equal(blockAt(pts, -50, -50, 10, 75), null);
});

test("ranching loop geometry and order", () => {
  assert.equal(STEPS.length, 5);
  const r = ring(5, 100, 100, 50); assert.ok(Math.abs(r[0].y - 50) < 1e-9);
  assert.match(arcBetween(0, 5, 100, 100, 50), /^M[\d.]+,[\d.]+A50,50 0 0 1 [\d.]+,[\d.]+$/);
  assert.equal(next(4), 0); assert.equal(prev(0), 4);
  assert.ok(ASIDE.includes("quota"));
});

test("ledger UI switches modes and reads blocks on hover", () => {
  const cv = fakeCanvas(800, 420);
  const btns = ["killed", "alive", "compare"].map(m => el("button", { dataset: { mode: m } }));
  const ids = { "lg-c": cv, "lg-big": el("b"), "lg-cap": el("p"), "lg-hover": el("p") };
  const frames = []; let t = 0;
  mountLedger({ doc: fakeDocument(ids, { "#lg-modes button": btns }), env: { innerHeight: 900, devicePixelRatio: 1, matchMedia: () => ({ matches: false }) }, now: () => t, raf: f => frames.push(f) });
  t = 16; frames.shift()();
  assert.equal(ids["lg-big"].textContent, "≈3,000,000");
  assert.ok(cv.ctx.calls.filter(c => c[0] === "arc").length >= KILLED);
  btns[2].dispatch("click"); t = 2000; frames.shift()();
  assert.equal(ids["lg-big"].textContent, "6 to 12×");
  cv.dispatch("pointermove", { clientX: 30, clientY: 200 });
  assert.match(ids["lg-hover"].textContent, /crocodiles, killed\.$/);
});

test("ranching UI selects steps", () => {
  const ids = { "rc-svg": el("svg"), "rc-n": el("p"), "rc-title": el("h4"), "rc-text": el("p"), "rc-next": el("button") };
  const ui = mountRanch({ doc: fakeDocument(ids) });
  assert.equal(ids["rc-title"].textContent, STEPS[0].title);
  ids["rc-next"].dispatch("click"); assert.equal(ui.current, 1);
  const nodes = all(ids["rc-svg"]).filter(n => n.attrs.role === "button");
  assert.equal(nodes.length, 5);
  nodes[4].dispatch("click"); assert.equal(ids["rc-title"].textContent, STEPS[4].title);
});
