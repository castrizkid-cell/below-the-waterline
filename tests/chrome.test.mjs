import test from "node:test";
import assert from "node:assert/strict";
import { activeIndex, startsHidden, revealDelay, INDEX_LINE, PRE_LINE, REVEAL_STEP_MS, REVEAL_ROOT_MARGIN } from "../js/chrome.mjs";
import { mount, mountIndex, mountReveals } from "../js/chrome-ui.mjs";

test("constants match the original page", () => {
  assert.equal(INDEX_LINE, .45); assert.equal(PRE_LINE, .92); assert.equal(REVEAL_STEP_MS, 70);
  assert.equal(REVEAL_ROOT_MARGIN, "0px 0px -8% 0px");
});

test("activeIndex picks the last section above 45% of the viewport", () => {
  assert.equal(activeIndex([], 1000), 0);
  assert.equal(activeIndex([500, 900, 1500], 1000), 0);   // nothing above 450: default first
  assert.equal(activeIndex([-800, 449, 1500], 1000), 1);
  assert.equal(activeIndex([-800, 450, 1500], 1000), 0);  // strictly less than
  assert.equal(activeIndex([-3000, -2000, -10], 1000), 2);
});

test("startsHidden is strictly below 92% of the viewport", () => {
  assert.equal(startsHidden(921, 1000), true);
  assert.equal(startsHidden(920, 1000), false);
  assert.equal(startsHidden(-50, 1000), false);
});

test("revealDelay staggers fade siblings and treats -1 as 0", () => {
  assert.equal(revealDelay(-1), 0);
  assert.equal(revealDelay(0), 0);
  assert.equal(revealDelay(3), 210);
  assert.equal(revealDelay(2, 10), 20);
});

// --- tiny fakes ---
function fakeClassList(...init) {
  const s = new Set(init);
  return { add: c => s.add(c), remove: c => s.delete(c), contains: c => s.has(c), toggle: (c, on) => { on ? s.add(c) : s.delete(c); return on; } };
}
function fakeEl({ top = 0, cls = [], href } = {}) {
  return { _top: top, classList: fakeClassList(...cls), getBoundingClientRect() { return { top: this._top }; }, getAttribute: k => (k === "href" ? href : null) };
}
function fakeEnv(h = 1000) {
  const handlers = {};
  return { innerHeight: h, addEventListener: (t, fn, opts) => { (handlers[t] ||= []).push({ fn, opts }); }, handlers, fire: t => handlers[t].forEach(x => x.fn()) };
}

test("mountIndex highlights the current section and follows scroll", () => {
  const secs = { "#a": fakeEl({ top: 0 }), "#b": fakeEl({ top: 600 }), "#c": fakeEl({ top: 1400 }) };
  const links = Object.keys(secs).map(href => fakeEl({ href }));
  const doc = { querySelectorAll: sel => { assert.equal(sel, "#index a"); return links; }, querySelector: s => secs[s] };
  const env = fakeEnv(1000);
  mountIndex({ doc, env });
  assert.deepEqual(links.map(l => l.classList.contains("on")), [true, false, false]);
  assert.deepEqual(env.handlers.scroll[0].opts, { passive: true });
  secs["#a"]._top = -900; secs["#b"]._top = 100; secs["#c"]._top = 900;
  env.fire("scroll");
  assert.deepEqual(links.map(l => l.classList.contains("on")), [false, true, false]);
  secs["#c"]._top = 200; env.fire("scroll");
  assert.deepEqual(links.map(l => l.classList.contains("on")), [false, false, true]);
});

function revealFixture() {
  const parent = { children: [] };
  const mk = (top, cls) => { const e = fakeEl({ top, cls }); e.parentElement = parent; parent.children.push(e); return e; };
  const head = mk(100, ["fade"]), img = mk(2000, ["rv"]), p1 = mk(2100, ["fade"]), plain = mk(2150, []), p2 = mk(2200, ["fade"]);
  const all = [head, img, p1, p2];
  const doc = { querySelectorAll: sel => { assert.equal(sel, ".rv, .fade"); return all; } };
  let observer;
  class IO {
    constructor(cb, opts) { this.cb = cb; this.opts = opts; this.watched = new Set(); observer = this; }
    observe(e) { this.watched.add(e); }
    unobserve(e) { this.watched.delete(e); }
  }
  const timers = [];
  return { head, img, p1, p2, plain, doc, IO, timers, setTimeout: (f, ms) => timers.push({ f, ms }), io: () => observer };
}

test("mountReveals hides below-the-fold elements and staggers their reveal", () => {
  const fx = revealFixture(), env = fakeEnv(1000);
  mountReveals({ doc: fx.doc, env, IntersectionObserver: fx.IO, setTimeout: fx.setTimeout, reducedMotion: false });
  const io = fx.io();
  assert.deepEqual(io.opts, { rootMargin: "0px 0px -8% 0px" });
  assert.equal(io.watched.size, 4);
  assert.equal(fx.head.classList.contains("pre"), false);
  for (const e of [fx.img, fx.p1, fx.p2]) assert.equal(e.classList.contains("pre"), true);
  io.cb([{ isIntersecting: false, target: fx.p2 }]);
  assert.equal(fx.timers.length, 0);
  io.cb([{ isIntersecting: true, target: fx.img }, { isIntersecting: true, target: fx.p1 }, { isIntersecting: true, target: fx.p2 }]);
  assert.deepEqual(fx.timers.map(t => t.ms), [0, 70, 140]); // img is not a .fade (index -1 -> 0); p1, p2 are 2nd and 3rd fades
  assert.equal(io.watched.size, 1);
  assert.equal(fx.p2.classList.contains("pre"), true);
  fx.timers.forEach(t => t.f());
  for (const e of [fx.img, fx.p1, fx.p2]) assert.equal(e.classList.contains("pre"), false);
});

test("mountReveals is a no-op with reduced motion or without IntersectionObserver", () => {
  const fx = revealFixture();
  assert.equal(mountReveals({ doc: fx.doc, env: fakeEnv(), IntersectionObserver: fx.IO, reducedMotion: true }), null);
  assert.equal(mountReveals({ doc: fx.doc, env: fakeEnv(), reducedMotion: false }), null);
  const env = { ...fakeEnv(), IntersectionObserver: fx.IO, matchMedia: q => ({ matches: q === "(prefers-reduced-motion: reduce)" }) };
  assert.equal(mountReveals({ doc: fx.doc, env }), null);
  assert.equal(fx.img.classList.contains("pre"), false);
});

test("mount wires both index and reveals", () => {
  const fx = revealFixture(), env = fakeEnv(1000);
  const secs = { "#a": fakeEl({ top: 0 }) }, links = [fakeEl({ href: "#a" })];
  const doc = { querySelectorAll: s => (s === "#index a" ? links : fx.doc.querySelectorAll(s)), querySelector: s => secs[s] };
  const r = mount({ doc, env, IntersectionObserver: fx.IO, setTimeout: fx.setTimeout, reducedMotion: false });
  assert.equal(links[0].classList.contains("on"), true);
  assert.equal(r.reveals, fx.io());
  assert.equal(typeof r.index.update, "function");
});
