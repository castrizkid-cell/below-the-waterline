import test from "node:test";
import assert from "node:assert/strict";
import { clamp, lerp, seg, ease, easeOut, hash01, groupThousands } from "../js/math.mjs";
import { mulberry32, shuffle } from "../js/rng.mjs";
import { fitCanvas, sectionProgress, visible, reducedMotion, loop } from "../js/dom.mjs";

test("math helpers", () => {
  assert.equal(clamp(5, 0, 1), 1);
  assert.equal(lerp(0, 10, .25), 2.5);
  assert.equal(seg(5, 0, 10), .5);
  assert.equal(ease(0), 0); assert.equal(ease(1), 1); assert.equal(easeOut(1), 1);
  assert.equal(hash01(3), hash01(3));
  assert.equal(groupThousands(3000000), "3,000,000");
  assert.equal(groupThousands(999), "999");
});

test("seeded rng is reproducible and in [0,1)", () => {
  const a = mulberry32(42), b = mulberry32(42);
  for (let i = 0; i < 100; i++) { const x = a(); assert.equal(x, b()); assert.ok(x >= 0 && x < 1); }
  assert.notEqual(mulberry32(1)(), mulberry32(2)());
});

test("shuffle is a permutation and deterministic for a seed", () => {
  const src = [...Array(50).keys()];
  const s1 = shuffle(src, mulberry32(7)), s2 = shuffle(src, mulberry32(7));
  assert.deepEqual(s1, s2);
  assert.deepEqual([...s1].sort((x, y) => x - y), src);
  assert.notDeepEqual(s1, src);
});

test("dom helpers work against a stubbed environment", () => {
  const env = { devicePixelRatio: 3, innerHeight: 1000, matchMedia: () => ({ matches: true }) };
  const calls = [];
  const cv = { width: 0, height: 0, getBoundingClientRect: () => ({ width: 100, height: 50 }), getContext: () => ({ setTransform: (...a) => calls.push(a) }) };
  const { w, h } = fitCanvas(cv, env);
  assert.deepEqual([w, h, cv.width, cv.height], [100, 50, 200, 100]); // DPR capped at 2
  assert.deepEqual(calls[0], [2, 0, 0, 2, 0, 0]);
  const el = { getBoundingClientRect: () => ({ top: -500, bottom: 1500, height: 2000 }) };
  assert.equal(sectionProgress(el, env), .5);
  assert.equal(visible(el, 0, env), true);
  assert.equal(reducedMotion(env), true);
  assert.equal(reducedMotion({}), false);
});

test("loop uses an injected clock and can stop", () => {
  let t = 0; const q = []; const seen = [];
  const stop = loop((dt) => seen.push(dt), { now: () => t, raf: f => q.push(f) });
  t = 16; q.shift()(); t = 32; q.shift()();
  assert.deepEqual(seen, [.016, .016]);
  stop(); q.shift()(); assert.equal(seen.length, 2);
});
