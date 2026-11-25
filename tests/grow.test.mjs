import test from "node:test";
import assert from "node:assert/strict";
import { massKg, formatMass, formatLen, lifeStage, sliderPct, inRange, parseRange, readout, approach, growLayout, crocOpts, drawPerson } from "../js/grow.mjs";

test("mass from length", () => {
  assert.ok(Math.abs(massKg(1) - 4.4) < 1e-12);
  assert.ok(Math.abs(massKg(2) - 35.2) < 1e-12);
  assert.equal(formatMass(massKg(.3)), "119 g");
  assert.equal(formatMass(massKg(1)), "4.4 kg");
  assert.equal(formatMass(massKg(4.5)), "400 kg"); // matches the page's initial text
  assert.equal(formatMass(massKg(6)), "950 kg");
});

test("life stage boundaries", () => {
  assert.equal(lifeStage(.3), "Hatchling"); assert.equal(lifeStage(.5), "Juvenile");
  assert.equal(lifeStage(1.2), "Sub-adult"); assert.equal(lifeStage(2.5), "Adult");
  assert.equal(lifeStage(4.2), "Large male"); assert.equal(lifeStage(4.19), "Adult");
});

test("readout and slider fill", () => {
  assert.deepEqual(readout(4.5), { len: "4.50 m", kg: "400 kg", stage: "Large male", pct: sliderPct(4.5) });
  assert.equal(formatLen(.3), "0.30 m");
  assert.equal(sliderPct(.3), "0%"); assert.equal(sliderPct(6), "100%");
});

test("diet / predator ranges are inclusive", () => {
  const r = parseRange({ min: "2.8", max: "6" });
  assert.deepEqual(r, { min: 2.8, max: 6 });
  assert.equal(inRange(2.8, r.min, r.max), true); assert.equal(inRange(6, r.min, r.max), true);
  assert.equal(inRange(2.75, r.min, r.max), false);
  const rows = [{ min: 0, max: 1 }, { min: .8, max: 6 }, { min: 4.2, max: 6 }];
  assert.deepEqual(rows.map(x => inRange(.9, x.min, x.max)), [true, true, false]);
});

test("displayed length eases toward target, snaps with reduced motion", () => {
  assert.equal(approach(1, 5, .016, true), 5);
  const a = approach(1, 5, .016);
  assert.ok(a > 1 && a < 5);
  assert.equal(approach(1, 5, 0), 1);
  // two half-steps equal one full step (frame-rate independent)
  assert.ok(Math.abs(approach(approach(1, 5, .01), 5, .01) - approach(1, 5, .02)) < 1e-12);
});

test("layout fits 6.9 m across and 2 m up", () => {
  assert.deepEqual(growLayout(730, 1000), { ppm: 100, base: 999, x0: 20 });
  assert.equal(growLayout(2000, 230).ppm, 100);
  const o = crocOpts(450, 20, 999, 0);
  assert.equal(o.L, 450); assert.equal(o.y, 999 - 450 * .115); assert.equal(o.eyeGlow, 0);
});

test("drawPerson stands 1.75 m tall on the baseline", () => {
  const calls = [], ctx = { fillStyle: "" };
  for (const m of ["beginPath", "arc", "fill", "moveTo", "lineTo", "closePath", "fillRect"]) ctx[m] = (...a) => calls.push([m, ...a]);
  assert.equal(drawPerson(ctx, 500, 400, 100), 175);
  const head = calls.find(c => c[0] === "arc");
  assert.ok(Math.abs(head[2] - head[3] - (400 - 175)) < 1e-9, "top of head at base - H");
  assert.equal(ctx.fillStyle, "#8f9c76");
  assert.ok(calls.filter(c => c[0] === "lineTo").every(c => c[2] <= 400));
});
