import test from "node:test";
import assert from "node:assert/strict";
import { PROF, halfH, drawCrocSide, drawGnu, Ripples } from "../js/croc-side.mjs";

// Recording canvas stub: every method call is pushed as [name, ...args]; properties are plain and settable.
function stubCtx() {
  const calls = [];
  const ctx = { calls, globalAlpha: 1, fillStyle: "#000", strokeStyle: "#000", lineWidth: 1, lineCap: "butt", font: "", globalCompositeOperation: "source-over" };
  for (const m of ["save", "restore", "translate", "rotate", "setTransform", "beginPath", "closePath", "moveTo", "lineTo", "quadraticCurveTo", "bezierCurveTo", "ellipse", "arc", "rect", "clip", "fill", "stroke", "fillRect", "clearRect", "fillText"])
    ctx[m] = (...a) => { calls.push([m, ...a]); };
  ctx.createLinearGradient = (...a) => { calls.push(["createLinearGradient", ...a]); const g = { stops: [], addColorStop: (o, c) => g.stops.push([o, c]) }; return g; };
  ctx.createRadialGradient = ctx.createLinearGradient;
  return ctx;
}
const count = (ctx, name) => ctx.calls.filter(c => c[0] === name).length;
const base = { L: 1000, x: 100, y: 300, t: 0 };

test("halfH follows the profile and is zero past the tail", () => {
  for (const [u, hh] of PROF) assert.ok(Math.abs(halfH(u) - hh) < 1e-12, `u=${u}`);
  assert.equal(halfH(1.5), 0);
  assert.ok(halfH(.38) > halfH(.05), "body is thicker than snout");
});

test("drawCrocSide returns an eye anchor above y and balanced save/restore", () => {
  const ctx = stubCtx();
  const r = drawCrocSide(ctx, base);
  assert.equal(r.top.length, 91); assert.equal(r.bot.length, 91);
  assert.ok(r.eye[1] < base.y + .04 * base.L, "eye sits on the top outline, above the body midline");
  assert.ok(r.eye[1] < r.bot[13][1]);
  assert.ok(r.eye[0] > base.x && r.eye[0] < base.x + .2 * base.L, "eye is near the head");
  assert.equal(count(ctx, "save"), count(ctx, "restore"));
  assert.equal(ctx.globalAlpha, 1);
});

test("jaw > 0 opens the mouth: teeth drawn and jaws rotated apart", () => {
  const shut = stubCtx(); drawCrocSide(shut, { ...base, jaw: 0 });
  const open = stubCtx(); drawCrocSide(open, { ...base, jaw: 1 });
  const rots = ctx => ctx.calls.filter(c => c[0] === "rotate").map(c => c[1]);
  assert.deepEqual(rots(shut), [0, -0]);
  assert.ok(rots(open).includes(.28) && rots(open).includes(-.34));
  assert.ok(count(open, "fill") > count(shut, "fill") + 8, "teeth add fills");
  assert.equal(count(open, "save"), count(open, "restore"));
});

test("options toggle legs, eye glow and alpha", () => {
  const withLegs = stubCtx(); drawCrocSide(withLegs, base);
  const noLegs = stubCtx(); drawCrocSide(noLegs, { ...base, legs: false });
  assert.equal(count(withLegs, "quadraticCurveTo") - count(noLegs, "quadraticCurveTo"), 2);
  const glow = stubCtx(); drawCrocSide(glow, { ...base, eyeGlow: 1 });
  assert.equal(count(glow, "ellipse") - count(withLegs, "ellipse"), 2);
  const faint = stubCtx(); drawCrocSide(faint, { ...base, alpha: .3 });
  assert.equal(faint.calls[0][0], "save");
  const tilted = stubCtx(); drawCrocSide(tilted, { ...base, tilt: -.28 });
  assert.equal(tilted.calls.find(c => c[0] === "rotate")[1], -.28);
});

test("drawCrocSide is deterministic", () => {
  const a = stubCtx(), b = stubCtx();
  drawCrocSide(a, { ...base, t: 2.5, sway: .6, paddle: .4 }); drawCrocSide(b, { ...base, t: 2.5, sway: .6, paddle: .4 });
  assert.deepEqual(a.calls, b.calls);
});

test("drawGnu returns a muzzle point left of the shoulder that moves with the head", () => {
  const ctx = stubCtx();
  const m = drawGnu(ctx, 500, 400, 100);
  assert.ok(m.mx < 500 && m.my < 400, "muzzle is ahead (left) of the forelegs and above the ground");
  assert.deepEqual(drawGnu(stubCtx(), 500, 400, 100), m);
  const up = drawGnu(stubCtx(), 500, 400, 100, { drop: 0 });
  assert.notDeepEqual(up, m);
  assert.equal(count(ctx, "save"), count(ctx, "restore"));
  assert.equal(ctx.calls[0][0], "save"); assert.deepEqual(ctx.calls[1], ["translate", 500, 400]);
});

test("Ripples: step ages and expires rings, draw does not advance time", () => {
  const r = new Ripples();
  r.add(10, 20, 100, 1);
  r.step(.5);
  assert.equal(r.list[0].t, .5);
  const ctx = stubCtx(); r.draw(ctx, .1); r.draw(ctx, .1);
  assert.equal(r.list[0].t, .5);
  assert.equal(count(ctx, "ellipse"), 6);
  const e = ctx.calls.find(c => c[0] === "ellipse");
  assert.ok(Math.abs(e[4] - e[3] * .1) < 1e-9, "squash applied");
  r.step(.6);
  assert.equal(r.list.length, 0);
});

test("Ripples caps at 40 rings, dropping the oldest", () => {
  const r = new Ripples();
  for (let i = 0; i < 45; i++) r.add(i, 0);
  assert.equal(r.list.length, 40);
  assert.equal(r.list[0].x, 5);
});
