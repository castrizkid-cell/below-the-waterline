import test from "node:test";
import assert from "node:assert/strict";
import { pose, STAGES, sideAt, mouthAt, planAt, planCroc, spine, arc, monthAngle, SCENE } from "../js/hunt-model.mjs";

test("seven stages, each fully written", () => {
  assert.equal(STAGES.length, 7);
  for (const s of STAGES) { assert.ok(s.p.length > 120); assert.ok(s.note.length > 10); }
});

test("the crocodile always faces its prey (snout points toward the bank)", () => {
  for (let s = 0; s <= 6.999; s += .05) {
    const { c, g } = pose(s);
    // crocodile faces +x; its snout must never be past the wildebeest's body
    assert.ok(c.x <= g.x + 40, `snout past prey at s=${s.toFixed(2)}`);
  }
});

test("jaws are shut while it waits and approaches", () => {
  for (let s = 0; s < 3; s += .1) assert.equal(pose(s).c.jaw, 0);
  assert.ok(Math.max(...[3.05, 3.1, 3.15, 3.2].map(s => pose(s).c.jaw)) > .8);
});

test("it is under water while it approaches", () => {
  assert.ok(pose(1.6).c.y > SCENE.WY + 60);
});

test("the strike reaches the drinking wildebeest", () => {
  const { c, g } = pose(3.45);
  assert.ok(g.x - c.x < 130);
});

test("roll happens only in stage VI", () => {
  assert.equal(pose(4.5).c.roll, 0);
  assert.ok(pose(5.5).c.roll > 1);
  assert.equal(pose(6.5).c.roll, 0);
});

test("profiles: body is deeper than the snout; mouth stays inside the head", () => {
  const snout = sideAt(.03), body = sideAt(.38);
  assert.ok(body.bot - body.top > 4 * (snout.bot - snout.top));
  for (let u = 0; u <= .2; u += .01) { const m = mouthAt(u); assert.ok(m > .2 && m < .8); }
  assert.ok(planAt(.4) > planAt(.1) * 2.5);
});

test("plan view: straight crocodile is as long as L and bends when asked", () => {
  const sp = spine({ x: 0, y: 0, heading: 0, L: 100 });
  assert.ok(Math.abs(sp.at(-1).x + 100) < 1e-6);
  const bent = spine({ x: 0, y: 0, heading: 0, L: 100, bend: () => 2 });
  assert.ok(Math.abs(bent.at(-1).y) > 20);
  const pc = planCroc({ x: 0, y: 0, heading: 0, L: 100 });
  assert.ok(pc.d.startsWith("M") && pc.d.endsWith("Z"));
  assert.equal(pc.legs.length, 4);
  assert.equal(pc.eyes.length, 2);
});

test("calendar arcs", () => {
  assert.equal(monthAngle(0), -Math.PI / 2);
  assert.match(arc(0, 0, 10, 0, Math.PI / 2), /^M10,0A10,10 0 0 1 0,10$/);
});
