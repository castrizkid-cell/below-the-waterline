// UI modules tested in isolation: fake DOM, fake canvas, injected clock/rng/timers. No browser.
import test from "node:test";
import assert from "node:assert/strict";
import { el, all, count, fakeDocument, fakeCanvas, FakePath2D } from "./helpers/fake-dom.mjs";
import { mount as mountOrigins } from "../js/origins-ui.mjs";
import { mount as mountDiagrams } from "../js/hunt-diagrams-ui.mjs";
import { mount as mountHunt, drawCroc, applyM, invertM } from "../js/hunt-scene-ui.mjs";
import { BRANCHES, SPECIES } from "../js/origins.mjs";
import { STAGES } from "../js/hunt-model.mjs";
import { mulberry32 } from "../js/rng.mjs";

const now0 = f => f(); // run deferred work immediately

test("origins-ui draws the tree and cladogram and responds to clicks", () => {
  const ids = {};
  for (const id of ["og-tree", "og-clade", "og-card", "ogc-when", "ogc-name", "ogc-who", "ogc-text", "og-sp", "ogs-name", "ogs-latin", "ogs-where", "ogs-len", "ogs-bar", "ogs-fact"]) ids[id] = el(id.startsWith("og-tree") || id === "og-clade" ? "svg" : "div");
  mountOrigins({ doc: fakeDocument(ids), defer: now0 });
  const tree = ids["og-tree"];
  assert.match(tree.attrs.viewBox, /^0 0 1200 \d+$/);
  const groups = all(tree).filter(c => c.attrs.role === "button");
  assert.equal(groups.length, BRANCHES.length + 1); // every branch + the thread
  assert.equal(ids["ogc-name"].textContent, "The line to the Nile crocodile");
  groups[0].dispatch("click");
  assert.ok(groups[0].classList.contains("on"));
  assert.ok(BRANCHES.some(b => b.name === ids["ogc-name"].textContent));
  // cladogram: one tip per species, Nile selected by default
  const tips = all(ids["og-clade"]).filter(c => c.attrs.role === "button");
  assert.equal(tips.length, Object.keys(SPECIES).length);
  assert.equal(ids["ogs-name"].textContent, "Nile crocodile");
});

test("hunt-diagrams fills every plan-view crocodile and the year ring", () => {
  const gs = [1, 2, 3].map(i => el("g", { dataset: { x: "100", y: "50", h: String(i * 30), l: "90", legs: "0" } }));
  const ids = { herd: el("g"), fish3: el("g"), fish4: el("g"), year: el("svg") };
  mountDiagrams({ doc: fakeDocument(ids, { "g.pc": gs }) });
  for (const g of gs) { assert.equal(count(g, "path"), 5); assert.equal(count(g, "circle"), 3); }
  assert.equal(count(ids.herd, "ellipse"), 46);
  assert.equal(ids.year.children.filter(c => c.tagName === "text").length, 12 + 2);
});

test("matrix helpers invert correctly", () => {
  const m = { a: 2, b: 0, c: 0, d: 3, e: 10, f: 20 }, [x, y] = applyM(m, 4, 5);
  const [u, v] = applyM(invertM(m), x, y);
  assert.ok(Math.abs(u - 4) < 1e-9 && Math.abs(v - 5) < 1e-9);
});

test("drawCroc draws on any 2D context and reports anchors", () => {
  const cv = fakeCanvas(), anchors = {};
  drawCroc(cv.ctx, { L: 400, x: 500, y: 300, T: 0, jaw: .8, Path2D: FakePath2D }, anchors);
  assert.ok(cv.ctx.calls.length > 200);
  assert.ok(anchors.eye[1] < 300 + 1, "eye sits on top of the head");
  assert.ok(anchors.snout[0] > anchors.tail[0], "faces right: snout is ahead of the tail");
});

test("hunt-scene mounts, renders a frame with an injected clock, and shows stage text", () => {
  const cv = fakeCanvas(1200, 620);
  const track = el("div", { getBoundingClientRect: () => ({ top: -100, bottom: 5000, height: 6000 }) });
  const lis = STAGES.map(() => { const li = el("li"); li.appendChild(el("b")); return li; });
  const ids = { "hunt-track": track, "hunt-c": cv, "h-roman": el("div"), "h-body": el("div") };
  const doc = fakeDocument(ids, { "#stages li": lis });
  const frames = []; let t = 0;
  mountHunt({ doc, env: { innerHeight: 900, devicePixelRatio: 1, matchMedia: () => ({ matches: false }), Path2D: FakePath2D }, now: () => t, raf: f => frames.push(f), rng: mulberry32(1), defer: now0 });
  t = 16; frames.shift()(t);
  assert.equal(ids["h-roman"].textContent, "I");
  assert.match(ids["h-body"].innerHTML, /It has been here before/);
  assert.ok(lis[0].classList.contains("on"));
  assert.ok(cv.ctx.calls.some(c => c[0] === "drawImage"), "background cached and blitted");
  assert.equal(frames.length, 1, "schedules exactly one next frame");
});
