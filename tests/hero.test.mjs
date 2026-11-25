import test from "node:test";
import assert from "node:assert/strict";
import { mulberry32 } from "../js/rng.mjs";
import { makeMotes, makeReeds, heroLayout, copyOpacity, blinkStep, tape } from "../js/hero.mjs";

test("motes and reeds are reproducible from a seed and in range", () => {
  assert.deepEqual(makeMotes(mulberry32(1)), makeMotes(mulberry32(1)));
  const motes = makeMotes(mulberry32(3)), reeds = makeReeds(mulberry32(3));
  assert.equal(motes.length, 90); assert.equal(reeds.length, 160);
  for (const m of motes) { assert.ok(m.x >= 0 && m.x < 1 && m.z >= .3 && m.z < 1 && m.s < 1000); }
  reeds.forEach((r, i) => { assert.ok(r.x >= i / 160 && r.x < i / 160 + .006); assert.ok(r.h >= .3 && r.h < 1 && Math.abs(r.b) <= .25); });
});

test("rng draw order matches the original (x, y, z, s)", () => {
  const seq = [.1, .2, .5, .9];
  let i = 0; const m = makeMotes(() => seq[i++ % 4], 1)[0];
  assert.deepEqual(m, { x: .1, y: .2, z: .3 + .5 * .7, s: 900 });
});

test("waterline climbs with scroll; desktop vs mobile sizing", () => {
  const top = heroLayout(0, 1200, 800), bottom = heroLayout(1, 1200, 800);
  assert.ok(Math.abs(top.wy - 800 * .66) < 1e-9);
  assert.ok(Math.abs(bottom.wy - 800 * .2) < 1e-9);
  assert.equal(top.L, 1200 * 1.15); assert.equal(top.sx, 600); assert.equal(top.mobile, false);
  assert.equal(heroLayout(0, 3000, 800).L, 1700);
  const m = heroLayout(.5, 400, 800);
  assert.equal(m.mobile, true); assert.equal(m.L, 840); assert.equal(m.sx, 144);
  assert.equal(heroLayout(.3, 1200, 800, 0).bob, 0);
});

test("copy fades: title out, under-copy in then out", () => {
  assert.deepEqual(copyOpacity(0), { h1: 1, lede: 1, under: 0, cue: 1 });
  const mid = copyOpacity(.75);
  assert.equal(mid.h1, 0); assert.equal(mid.cue, 0); assert.equal(mid.under, 1);
  assert.equal(copyOpacity(1).under, 0);
});

test("blink: closes mid-blink, schedules the next from rng", () => {
  assert.deepEqual(blinkStep(1, 3, () => 0), { blink: 0, blinkAt: 3 });
  const mid = blinkStep(3.14, 3, () => { throw new Error("no rng mid-blink"); });
  assert.ok(Math.abs(mid.blink - 1) < 1e-9);
  assert.deepEqual(blinkStep(4, 3, () => .5), { blink: 0, blinkAt: 4 + 3 + 2.5 });
});

test("measuring tape appears after p=.55 with ticks up to its end", () => {
  const g = { sx: 100, L: 900, w: 1200, crocTop: 300 };
  assert.equal(tape(.5, g), null);
  const full = tape(1, g);
  assert.equal(full.mt, 1); assert.equal(full.x1, 1000); assert.equal(full.y, 300 + 900 * .14);
  assert.equal(full.ticks.length, 10);
  assert.deepEqual(full.ticks.filter(t => t.big).map(t => t.m), [0, 1, 2, 3, 4]);
  const part = tape(.6, g);
  assert.ok(part.ticks.length < 10 && part.ticks.every(t => t.x <= part.x1));
});
