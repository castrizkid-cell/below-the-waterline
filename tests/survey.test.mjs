// Night spotlight survey: pure model and UI mounted against fakes with an injected clock.
import test from "node:test";
import assert from "node:assert/strict";
import { el, fakeDocument, fakeCanvas, FakePath2D } from "./helpers/fake-dom.mjs";
import { makeRiver, surfacedAt, diveAge, inBeam, beamStrength, nearestCountable, makeSurvey, moveBeam, countAt, countNearest, reveal, summary, eyeLayout, RIVER, HIT_R } from "../js/survey.mjs";
import { mount } from "../js/survey-ui.mjs";

const surfacedT = (c, from = 0) => { for (let t = from; t < from + 60; t += 0.05) if (surfacedAt(c, t)) return t; throw new Error("never surfaces"); };
const submergedT = (c, from = 0) => { for (let t = from; t < from + 60; t += 0.05) if (!surfacedAt(c, t)) return t; throw new Error("never dives"); };

test("makeRiver is deterministic per seed and within range", () => {
  assert.deepEqual(makeRiver(7), makeRiver(7));
  assert.notDeepEqual(makeRiver(7), makeRiver(8));
  const r = makeRiver(3);
  assert.equal(r.length, 48);
  assert.equal(makeRiver(3, 5).length, 5);
  assert.equal(new Set(r.map(c => c.id)).size, 48);
  for (const c of r) {
    assert.ok(c.x >= RIVER.left && c.x <= RIVER.right && c.y >= RIVER.top && c.y <= RIVER.bottom);
    assert.ok(c.size >= 1.5 && c.size <= 5);
    assert.ok(c.heading === 1 || c.heading === -1);
    assert.ok(c.phase >= 0 && c.phase < 1);
  }
  assert.ok(r.some(c => c.heading === 1) && r.some(c => c.heading === -1));
});

test("each animal is surfaced 55-70% of a long window and dives for a few seconds", () => {
  for (const c of makeRiver(11)) {
    let up = 0, n = 0, run = 0, longest = 0;
    for (let t = 0; t < 600; t += 0.1, n++) {
      if (surfacedAt(c, t)) { up++; run = 0; } else { run += 0.1; longest = Math.max(longest, run); }
    }
    const f = up / n;
    assert.ok(f >= 0.54 && f <= 0.71, `fraction ${f}`);
    assert.ok(longest >= 2 && longest <= 7.5, `dive ${longest}`);
    assert.equal(surfacedAt(c, 42.3), surfacedAt(c, 42.3), "deterministic");
  }
});

test("diveAge is null while surfaced and grows from 0 after a dive", () => {
  const c = makeRiver(2)[0], t = submergedT(c, surfacedT(c));
  assert.equal(diveAge(c, surfacedT(c)), null);
  assert.ok(diveAge(c, t) >= 0 && diveAge(c, t) < 0.06);
  assert.ok(diveAge(c, t + 1) > diveAge(c, t));
});

test("inBeam and beamStrength: circle in width units with aspect correction", () => {
  const beam = { x: 0.5, y: 0.5, r: 0.1 };
  assert.ok(inBeam({ x: 0.5, y: 0.5 }, beam));
  assert.ok(inBeam({ x: 0.6, y: 0.5 }, beam), "edge counts");
  assert.ok(!inBeam({ x: 0.61, y: 0.5 }, beam));
  assert.ok(!inBeam({ x: 0.5, y: 0.65 }, beam));
  assert.ok(inBeam({ x: 0.5, y: 0.65 }, beam, 0.5), "y squashed by height/width");
  assert.equal(beamStrength({ x: 0.5, y: 0.5 }, beam), 1);
  assert.equal(beamStrength({ x: 0.9, y: 0.5 }, beam), 0);
  assert.ok(Math.abs(beamStrength({ x: 0.55, y: 0.5 }, beam) - 0.5) < 1e-9);
});

test("nearestCountable picks the closest surfaced, lit, uncounted animal", () => {
  const base = { period: 10, duty: 0.6, phase: 0, size: 3, heading: 1 };
  const crocs = [
    { ...base, id: 0, x: 0.52, y: 0.5 },
    { ...base, id: 1, x: 0.55, y: 0.5 },
    { ...base, id: 2, x: 0.51, y: 0.5, phase: 0.5 }, // under at t = 1 (u = 0.6)
    { ...base, id: 3, x: 0.9, y: 0.5 }, // out of the light
  ];
  const beam = { x: 0.5, y: 0.5, r: 0.1 };
  assert.equal(surfacedAt(crocs[2], 1), false);
  assert.equal(nearestCountable(crocs, beam, 1).id, 0);
  assert.equal(nearestCountable(crocs, beam, 1, [0]).id, 1);
  assert.equal(nearestCountable(crocs, beam, 1, new Set([0, 1])), null);
  assert.equal(nearestCountable(crocs, beam, 7).id, 2, "at t = 7 only the out-of-phase one is up");
});

test("countAt counts once, needs light, surface and a near click", () => {
  let s = makeSurvey(5);
  const c = s.crocs[0], t = surfacedT(c);
  const off = moveBeam(s, c.x > 0.5 ? 0.02 : 0.98, c.y);
  assert.equal(countAt(off, c, t), off, "dark: nothing counted, same state");
  s = moveBeam(s, c.x, c.y);
  assert.equal(countAt({ ...s, crocs: [c] }, { x: c.x + HIT_R * 1.5, y: c.y }, t).counted.length, 0, "click too far from the eyes");
  assert.equal(countAt(s, c, submergedT(c, t)), s, "underwater animals cannot be counted");
  const s1 = countAt(s, c, t);
  assert.ok(s1.counted.includes(c.id));
  assert.equal(s.counted.length, 0, "input state not mutated");
  const s2 = countAt(s1, c, t);
  assert.equal(s2.counted.filter(id => id === c.id).length, 1, "no double count");
  const s3 = countNearest(s2, t);
  assert.ok(!s3.counted.slice(0, -1).includes(s3.counted.at(-1)), "Enter never repeats");
  assert.equal(countAt(reveal(s), c, t).counted.length, 0, "no counting after reveal");
  assert.equal(countNearest(reveal(s), t).counted.length, 0);
});

test("countNearest exhausts the beam without double counting", () => {
  let s = moveBeam(makeSurvey(9), 0.5, 0.6);
  s = { ...s, beam: { ...s.beam, r: 2 } }; // light the whole river
  const up = s.crocs.filter(c => surfacedAt(c, 3)).length;
  for (let i = 0; i < 60; i++) s = countNearest(s, 3);
  assert.equal(s.counted.length, up);
  assert.equal(new Set(s.counted).size, up);
});

test("summary numbers and message", () => {
  const s = makeSurvey(1);
  const some = { ...s, counted: s.crocs.slice(0, 31).map(c => c.id) };
  const r = summary(some);
  assert.deepEqual({ ...r, message: undefined }, { counted: 31, total: 48, missed: 17, pct: 65, message: undefined });
  assert.match(r.message, /^You counted 31 of 48\. The 17 you missed were underwater, out of the light, or counted by nobody\./);
  assert.match(summary({ ...s, counted: s.crocs.slice(0, 47).map(c => c.id) }).message, /The 1 you missed was underwater/);
  assert.match(summary(s).message, /^You counted none of 48\./);
  assert.equal(summary(s).pct, 0);
  assert.match(summary({ ...s, counted: s.crocs.map(c => c.id) }).message, /^You counted all 48\./);
  assert.equal(summary({ ...s, crocs: [], counted: [] }).pct, 0);
});

test("eyeLayout scales with size and nostril sits ahead of the heading", () => {
  const a = eyeLayout({ size: 2, y: 0.6, heading: 1 }, 1000), b = eyeLayout({ size: 4, y: 0.6, heading: -1 }, 1000);
  assert.ok(Math.abs(b.gap - 2 * a.gap) < 1e-9);
  assert.ok(a.nostril.dx > 0 && b.nostril.dx < 0);
  assert.ok(eyeLayout({ size: 3, y: 0.9, heading: 1 }, 1000).gap > eyeLayout({ size: 3, y: 0.3, heading: 1 }, 1000).gap, "nearer looks bigger");
});

// ---- UI ----
const env = (extra = {}) => ({ innerHeight: 900, devicePixelRatio: 2, matchMedia: () => ({ matches: false }), Path2D: FakePath2D, ...extra });
const clock = () => { let t = 0; const q = []; return { now: () => t, raf: f => q.push(f), run(n = 1, dt = 16) { for (let i = 0; i < n; i++) { t += dt; const f = q.shift(); f && f(t); } }, q }; };
const W = 1600, H = 700;
function setup(extra) {
  const ids = { "sv-c": fakeCanvas(W, H), "sv-reveal": el("button"), "sv-reset": el("button"), "sv-count": el("span"), "sv-total": el("span"), "sv-msg": el("p") };
  const c = clock();
  const ui = mount({ doc: fakeDocument(ids), env: env(extra), now: c.now, raf: c.raf });
  return { ids, c, ui };
}

test("ui: mounts, draws at DPR 2, counts a clicked eye pair once, reveals and resets", () => {
  const { ids, c, ui } = setup();
  const cv = ids["sv-c"];
  assert.equal(ids["sv-total"].textContent, "?");
  assert.equal(ids["sv-count"].textContent, "0");
  assert.equal(ui.seed, 7);
  c.run(3);
  assert.equal(cv.width, W * 2, "crisp backing store");
  assert.ok(cv.ctx.calls.length > 50, "drew the river");
  assert.equal(c.q.length, 1, "one frame scheduled");
  assert.equal(cv.attrs.tabindex, "0");

  const t = ui.time, target = ui.state.crocs.find(k => surfacedAt(k, t));
  const at = { clientX: target.x * W, clientY: target.y * H };
  cv.dispatch("pointermove", at);
  assert.ok(Math.abs(ui.state.beam.x - target.x) < 1e-9);
  cv.dispatch("click", at);
  assert.equal(ids["sv-count"].textContent, "1");
  assert.ok(ui.state.counted.includes(target.id));
  cv.dispatch("click", at);
  assert.equal(ui.state.counted.filter(id => id === target.id).length, 1, "no double count");
  c.run(2);
  assert.ok(cv.ctx.calls.some(k => k[0] === "fillText" && k[1] === "1"), "counted number drawn");

  ids["sv-reveal"].dispatch("click");
  assert.equal(ids["sv-total"].textContent, "48");
  assert.match(ids["sv-msg"].textContent, new RegExp(`^You counted ${ui.state.counted.length} of 48\\.`));
  assert.ok(ui.state.revealed);
  c.run(1);

  ids["sv-reset"].dispatch("click");
  assert.equal(ui.seed, 8);
  assert.equal(ids["sv-total"].textContent, "?");
  assert.equal(ids["sv-count"].textContent, "0");
  assert.equal(ui.state.counted.length, 0);
});

test("ui: arrow keys move the beam and Enter counts the nearest lit eyes", () => {
  const { ids, c, ui } = setup();
  c.run(2);
  const cv = ids["sv-c"], x0 = ui.state.beam.x;
  cv.dispatch("keydown", { key: "ArrowRight" });
  assert.ok(ui.state.beam.x > x0);
  cv.dispatch("keydown", { key: "ArrowLeft" }); cv.dispatch("keydown", { key: "ArrowDown" }); cv.dispatch("keydown", { key: "ArrowUp" });
  // sweep the light until Enter finds something
  let found = false;
  for (let gx = 0.05; gx < 1 && !found; gx += 0.1) for (let gy = 0.25; gy < 1 && !found; gy += 0.15) {
    cv.dispatch("pointermove", { clientX: gx * W, clientY: gy * H });
    cv.dispatch("keydown", { key: "Enter" });
    found = ui.state.counted.length > 0;
  }
  assert.ok(found);
  assert.equal(ids["sv-count"].textContent, "1");
});

test("ui: skips drawing when off screen, reduced motion still advances dives", () => {
  const { ids, c, ui } = setup({ innerHeight: 900, matchMedia: () => ({ matches: true }) });
  ids["sv-c"].getBoundingClientRect = () => ({ top: 2000, bottom: 2700, width: W, height: H });
  c.run(5);
  assert.equal(ids["sv-c"].ctx.calls.length, 0);
  assert.ok(ui.time > 0.05);
  assert.equal(mount({ doc: fakeDocument({}) }), null, "no canvas, no mount");
});
