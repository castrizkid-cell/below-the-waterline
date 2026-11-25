import test from "node:test";
import assert from "node:assert/strict";
import { mulberry32 } from "../js/rng.mjs";
import { initialState, step, pose, waitMs, score, isFast, resultMessage, wantsSpace, MSG, STRIKE_WINDOW, SINK_LEAD } from "../js/edge.mjs";

const press = (s, now, rng = () => 0) => step(s, { type: "press" }, now, rng);
const tick = (s, now) => step(s, { type: "tick" }, now, () => { throw new Error("tick must not use rng"); });
const noRng = () => { throw new Error("unexpected rng"); };

test("press from idle starts watching with a seeded wait", () => {
  const s = press(initialState(), 1000, () => 0);
  assert.equal(s.phase, "watch");
  assert.equal(s.strikeAt, 1000 + 2200); assert.equal(s.sinkAt, 1000 + 2200 - SINK_LEAD);
  assert.deepEqual([s.big, s.small], MSG.watch);
  assert.equal(press(initialState(), 0, () => .5).strikeAt, 2200 + 3250);
});

test("a fixed seed gives a fixed wait", () => {
  const a = press(initialState(), 0, mulberry32(99)), b = press(initialState(), 0, mulberry32(99));
  assert.equal(a.strikeAt, b.strikeAt);
  const w = waitMs(mulberry32(99));
  assert.equal(a.strikeAt, w);
  assert.ok(w >= 2200 && w < 8700);
  assert.notEqual(waitMs(mulberry32(1)), waitMs(mulberry32(2)));
});

test("early press: too soon, then press restarts", () => {
  let s = press(initialState(), 0, () => 0);
  s = press(s, 1000, noRng);
  assert.equal(s.phase, "early");
  assert.deepEqual([s.big, s.small], MSG.early);
  assert.equal(s.caught, 0); assert.equal(s.lastText, null);
  s = press(s, 5000, () => 1 / 6500);
  assert.equal(s.phase, "watch"); assert.equal(s.strikeAt, 5000 + 2201);
});

test("tick turns watch into strike at strikeAt, clearing the message", () => {
  let s = press(initialState(), 0, () => 0);
  assert.equal(tick(s, 2199).phase, "watch");
  s = tick(s, 2200);
  assert.equal(s.phase, "strike"); assert.equal(s.big, ""); assert.equal(s.small, "");
});

test("a fast hit: scored, best set, not caught", () => {
  let s = tick(press(initialState(), 0, () => 0), 2200);
  s = press(s, 2200 + 180.4, noRng);
  assert.equal(s.phase, "done"); assert.equal(s.result, 180); assert.equal(s.best, 180);
  assert.equal(s.lastText, "180 ms"); assert.equal(s.caught, 0);
  assert.equal(s.big, "180 ms"); assert.match(s.small, /Faster than most people/);
  // a slower second try keeps the best and counts as caught
  s = tick(press(s, 10000, () => 0), 12200);
  s = press(s, 12200 + 350, noRng);
  assert.equal(s.best, 180); assert.equal(s.lastText, "350 ms"); assert.equal(s.caught, 1);
  assert.match(s.small, /jaws were already shut/);
});

test("a miss: no reaction within the window means caught", () => {
  let s = tick(press(initialState(), 0, () => 0), 2200);
  assert.equal(tick(s, 2200 + STRIKE_WINDOW).phase, "strike");
  s = tick(s, 2200 + STRIKE_WINDOW + 1);
  assert.equal(s.phase, "done"); assert.equal(s.caught, 1); assert.equal(s.lastText, "—");
  assert.deepEqual([s.big, s.small], MSG.caught);
  assert.equal(s.best, Infinity);
});

test("a late tick can go straight from watch to caught", () => {
  const s = tick(press(initialState(), 0, () => 0), 9999);
  assert.equal(s.phase, "done"); assert.equal(s.caught, 1);
});

test("step never mutates and ignores irrelevant events", () => {
  const s0 = initialState(), frozen = JSON.stringify(s0);
  press(s0, 0, () => 0); tick(s0, 1e9);
  assert.equal(JSON.stringify(s0), frozen);
  assert.equal(tick(s0, 1e9), s0);
  assert.equal(step(s0, { type: "other" }, 0, noRng), s0);
});

test("scoring and messages", () => {
  assert.equal(score(1234.6, 1000), 235);
  assert.equal(isFast(199), true); assert.equal(isFast(200), false);
  assert.deepEqual(resultMessage(150)[0], "150 ms");
  assert.equal(wantsSpace("watch"), true); assert.equal(wantsSpace("strike"), true); assert.equal(wantsSpace("idle"), false);
});

test("pose: rest, sinking eyes, lunge, and lunged after a hit", () => {
  const w = 800, h = 500;
  const rest = pose(initialState(), 0, w, h, 0);
  assert.equal(rest.WY, 300); assert.equal(rest.L, 1040); assert.equal(rest.x, 144); assert.equal(rest.jaw, 0); assert.equal(rest.eye, 1);
  const watching = press(initialState(), 0, () => 0);
  const sink = pose(watching, 2200 - 350, w, h, 0);
  assert.ok(sink.eye < 1 && sink.y > rest.y);
  const striking = tick(watching, 2200);
  const lunge = pose(striking, 2200 + 80, w, h, 0);
  assert.ok(lunge.jaw > 0 && lunge.tilt < 0 && lunge.x > rest.x);
  const hit = press(striking, 2300, noRng);
  const after = pose(hit, 5000, w, h, 0);
  assert.equal(after.x, 400); assert.equal(after.jaw, 0); assert.ok(Math.abs(after.tilt + .28) < 1e-12);
  const missed = tick(striking, 9999);
  assert.equal(pose(missed, 9999, w, h, 0).x, 144, "with no result the croc rests");
});
