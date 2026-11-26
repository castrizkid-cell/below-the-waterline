import test from "node:test";
import assert from "node:assert/strict";
import { DURATION, CHAPTERS, frame, gnu, croc, groundY, track, timeScale, eventsBetween, notesAt, fmtTime, EDGE_X } from "../js/film-time.mjs";
import { crocFrame, skin, shade, limbChain, gnuHead, gnuToWorld, pinMuzzle, gnuLegs, HINGE } from "../js/film-anatomy.mjs";
import { createFx } from "../js/film-fx.mjs";
import { paint, viewOf, gnuMuzzleWorld } from "../js/film-paint.mjs";
import { mount as mountPlayer } from "../js/player-ui.mjs";
import { huntFilm } from "../js/hunt-film.mjs";
const mount = o => mountPlayer({ prefix: "film", film: huntFilm, caption: ["h-roman", "h-body"], ...o });
import { mulberry32 } from "../js/rng.mjs";
import { el, fakeDocument, fakeCanvas } from "./helpers/fake-dom.mjs";

test("chapters tile the film with no gaps", () => {
  assert.equal(CHAPTERS[0].t0, 0); assert.equal(CHAPTERS.at(-1).t1, DURATION);
  CHAPTERS.slice(1).forEach((c, i) => assert.equal(c.t0, CHAPTERS[i].t1));
  assert.equal(frame(26).chapter.key, "strike");
});
test("keyframe tracks interpolate and hold their ends", () => {
  const tr = track([[0, 0], [1, 10, "lin"]]);
  assert.equal(tr(-1), 0); assert.equal(tr(.5), 5); assert.equal(tr(2), 10);
});
test("the strike plays in slow motion; the rest at full speed", () => {
  assert.equal(timeScale(10), 1); assert.ok(timeScale(26.4) < .3);
});
test("the bank rises out of deep water", () => {
  assert.ok(groundY(10) > 3); assert.ok(Math.abs(groundY(EDGE_X)) < .01); assert.ok(groundY(25) < -.5);
});
test("the crocodile always faces the bank and never passes through the riverbed", () => {
  for (let t = 0; t <= DURATION; t += .5) {
    const f = frame(t), tail = f.cf.at(1), mid = f.cf.at(.35);
    assert.ok(f.cf.at(0).x > tail.x, `faces right at ${t}`);
    assert.ok(mid.y + .2 < groundY(mid.x) + .05, `belly above the bed at ${t}`);
  }
});
test("drinking muzzle reaches the water; once bitten, it stays in the jaws", () => {
  const drink = gnu(20), [mx, my] = gnuToWorld(drink, ...gnuHead(drink.drop).muzzle);
  assert.ok(Math.abs(my) < .1 && mx < EDGE_X + .1, "muzzle at the waterline");
  for (const t of [26.3, 28, 31, 35, 40, 44]) {
    const f = frame(t), g = f.cf.grip(), [x, y] = gnuMuzzleWorld(f.gnu);
    assert.ok(Math.hypot(x - g.x, y - g.y) < .02, `pinned at ${t}`);
  }
});
test("death roll: three full turns; then the carcass floats belly-up and the jaws tear at it", () => {
  assert.ok(Math.abs(croc(45).roll - Math.PI * 6) < 1e-9 || Math.abs(frame(45).cf.roll) < 1e-6 + 2 * Math.PI);
  const f = frame(53);
  assert.ok(Math.cos(f.gnu.axial) < -.8, "belly-up");
  assert.ok(f.croc.jaw < .15, "jaws clamped while tearing");
  assert.equal(frame(56).croc.chunk, 1); assert.ok(frame(56).croc.pitch < -.3, "head up to swallow");
});
test("events and notes are found by time", () => {
  assert.ok(eventsBetween(25.7, 25.9).some(e => e.type === "erupt"));
  assert.equal(eventsBetween(0, 0).length, 0);
  assert.ok(notesAt(26.5).length >= 1); assert.equal(fmtTime(65.9), "1:05");
});
test("crocodile mesh: jaw opens about the joint, skin and shading stay in range", () => {
  const shut = crocFrame({ x: 0, y: 0, pitch: 0, jaw: 0, t: 0 }), open = crocFrame({ x: 0, y: 0, pitch: 0, jaw: 1, t: 0 });
  const lipShut = shut.surface(.02, shut.cutAngle(.02), "lower"), lipOpen = open.surface(.02, open.cutAngle(.02), "lower");
  assert.ok(lipOpen.y - lipShut.y > .3, "lower jaw drops");
  assert.ok(shut.mesh(16, 6).length === 17);
  for (const [u, ph] of [[.1, 0], [.4, 1.5], [.8, 3]]) { const c = shade(skin(u, ph, 3, 4), -.5, .5); c.forEach(x => assert.ok(x >= 0 && x <= 255)); }
  assert.ok(skin(.3, Math.PI)[0] > skin(.3, 0)[0], "belly paler than back");
  assert.equal(limbChain(shut, "front", true, 0).length, 4);
  assert.ok(HINGE > .1);
});
test("pinMuzzle puts the muzzle exactly where asked", () => {
  const p = pinMuzzle({ x: 0, y: 0, rot: .3, axial: 1, drop: .4 }, 5, -1), [x, y] = gnuToWorld(p, ...gnuHead(.4).muzzle);
  assert.ok(Math.abs(x - 5) < 1e-9 && Math.abs(y + 1) < 1e-9);
  assert.equal(gnuLegs({ phase: 0 }).length, 4);
});
test("water: spray falls back in, bubbles rise and burst, the surface carries ripples", () => {
  const fx = createFx(mulberry32(3)), at = { snout: { x: 0, y: -.3 }, nostril: { x: 0, y: .05 }, gnu: { x: 1, y: 0 } };
  fx.spawn({ type: "erupt", power: 1 }, at); fx.spawn({ type: "exhale", n: 10 }, at);
  const n = fx.P.length; assert.ok(n > 100);
  const calm = createFx(); const flat = calm.surface(0);
  assert.notEqual(fx.surface(.5), flat);
  for (let i = 0; i < 120; i++) fx.step(1 / 30);
  assert.ok(fx.P.filter(p => p.k === "drop").length < 20, "spray has landed");
  fx.emit({ bubbles: 30, spray: 0, silt: 0 }, 1, at); assert.ok(fx.P.some(p => p.k === "bubble"));
  fx.clear(); assert.equal(fx.P.length, 0);
});
test("paint draws a full frame and is deterministic", () => {
  const a = fakeCanvas(), b = fakeCanvas(), f = frame(26.2);
  paint(a.ctx, 960, 440, f, createFx(), { notes: true }); paint(b.ctx, 960, 440, f, createFx(), { notes: true });
  assert.ok(a.ctx.calls.length > 1500); assert.deepEqual(a.ctx.calls, b.ctx.calls);
  const v = viewOf(1000, 500, { x: 10, y: 0, w: 20, shake: 0 });
  assert.equal(v.X(10), 500); assert.equal(v.s, 50);
});
test("player: mounts, plays with an injected clock, seeks by chapter and scrubber, and responds to keys", () => {
  const cv = fakeCanvas(960, 440), box = el("figure"), scrub = el("div", { getBoundingClientRect: () => ({ left: 0, width: 660, top: 0, height: 20 }) });
  const ids = { "film-c": cv, film: box, "film-play": el("button"), "film-big": el("button"), "film-time": el("span"), "film-scrub": scrub, "film-fill": el("b"), "film-head": el("b"), "film-tip": el("span"), "film-ch": el("div"), "film-card": el("div"), "film-slow": el("div"), "film-notes": el("button"), "h-roman": el("div"), "h-body": el("div") };
  const speeds = [".25", ".5", "1"].map(v => { const b = el("button"); b.dataset.speed = v; return b; });
  const doc = fakeDocument(ids, { "#film [data-speed]": speeds });
  const frames = [];
  const api = mount({ doc, env: { devicePixelRatio: 1 }, now: () => 0, raf: f => frames.push(f), rng: mulberry32(1) });
  assert.equal(ids["h-roman"].textContent, "I");
  assert.equal(ids["film-ch"].children.length, 7);
  ids["film-play"].dispatch("click"); assert.equal(api.state.playing, true);
  for (let ms = 0; ms <= 1000; ms += 100) frames.shift()(ms);
  assert.ok(api.state.t > .9 && api.state.t < 1.1, "one second of film per second");
  ids["film-ch"].children[3].dispatch("click"); assert.equal(ids["h-roman"].textContent, "IV");
  scrub.dispatch("pointerdown", { clientX: 330, pointerId: 1 }); assert.ok(Math.abs(api.state.t - 33) < .01);
  scrub.dispatch("pointerup", {});
  box.dispatch("keydown", { key: "7" }); assert.equal(ids["h-roman"].textContent, "VII");
  speeds[0].dispatch("click"); assert.equal(api.state.speed, .25);
  ids["film-notes"].dispatch("click"); assert.equal(api.state.notes, false);
  assert.equal(mount({ doc: fakeDocument({}) }), null);
});
