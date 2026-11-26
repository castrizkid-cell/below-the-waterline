import test from "node:test";
import assert from "node:assert/strict";
import { FOSSILS, SHOTS, CHAPTERS, DURATION, frame, groundFor, actorPose, LINEUP, fmtMa, byId } from "../js/deep-time.mjs";
import { paint, WORLDS, scaleInset, sizeChart, light } from "../js/deep-paint.mjs";
import { deepFilm, speciesHTML } from "../js/deep-film.mjs";
import { huntFilm } from "../js/hunt-film.mjs";
import { mount as mountPlayer } from "../js/player-ui.mjs";
import { crocFrame } from "../js/film-anatomy.mjs";
import { mulberry32 } from "../js/rng.mjs";
import { el, fakeDocument, fakeCanvas } from "./helpers/fake-dom.mjs";

test("every animal has a date, a size, a place, a fact and a world to live in", () => {
  assert.equal(FOSSILS.length, 14);
  for (const f of FOSSILS) {
    for (const k of ["name", "latin", "age", "lenText", "where", "fact", "group"]) assert.ok(f[k], `${f.id}.${k}`);
    assert.ok(f.len > .5 && f.len < 12.6, f.id);
    assert.ok(WORLDS[f.scene], `${f.id} world`);
    if (f.mode === "walk") assert.ok(f.leg > .1, `${f.id} has legs`);
  }
  assert.equal(byId("niloticus").ma, 0);
});
test("the film runs oldest to newest, with no gaps, and the chapters tile it", () => {
  SHOTS.slice(1).forEach((s, i) => { assert.equal(s.t0, SHOTS[i].t1); assert.ok(s.ma[0] <= SHOTS[i].ma[0] + 1e-9, `${s.i} older than the shot before`); });
  assert.equal(SHOTS.at(-1).t1, DURATION);
  assert.equal(CHAPTERS[0].t0, 0); assert.equal(CHAPTERS.at(-1).t1, DURATION);
  CHAPTERS.slice(1).forEach((c, i) => assert.equal(c.t0, CHAPTERS[i].t1));
});
test("the clock shows the right period at each extinction", () => {
  assert.equal(frame(SHOTS[3].t0 + .5).period.name, "Triassic");
  const kpg = SHOTS.find(s => s.scene === "kpg");
  assert.equal(frame(kpg.t0 + .2).period.name, "Cretaceous");
  assert.equal(frame(kpg.t1 - .2).period.name, "Paleogene");
  assert.equal(fmtMa(0), "Today"); assert.equal(fmtMa(215), "215 million years ago");
});
test("walkers stand on the ground; swimmers are in the water", () => {
  for (const s of SHOTS.filter(s => s.kind === "species")) {
    const f = frame(s.t0 + s.dur / 2), a = f.actors[0];
    if (s.sp.mode === "walk") {
      const belly = a.cf.surface(.4, Math.PI, null).y, g = f.ground(a.x - a.L * .4);
      assert.ok(g - belly > a.gait.leg * .5 && g - belly < a.gait.leg * 1.2, `${s.id} legs reach the ground`);
    } else assert.ok(a.y > -.05, `${s.id} in the water`);
  }
});
test("the line-up runs smallest to largest and ends as a size chart", () => {
  for (let i = 1; i < LINEUP.length; i++) assert.ok(LINEUP[i].sp.len >= LINEUP[i - 1].sp.len);
  const end = frame(DURATION - .1);
  assert.equal(end.actors.length, 14); assert.ok(end.chart > .99);
});
test("species shapes change the body: bulla, short snout, fluke", () => {
  const nile = crocFrame({ x: 0, y: 0, pitch: 0, L: 5, t: 0 });
  const sarco = crocFrame({ x: 0, y: 0, pitch: 0, L: 5, t: 0, shape: byId("sarcosuchus").shape });
  assert.ok(sarco.section(.005).top < nile.section(.005).top, "bulb on the snout");
  const simo = crocFrame({ x: 0, y: 0, pitch: 0, L: 1, t: 0, shape: byId("simosuchus").shape });
  assert.ok(simo.hinge < .12);
  const metro = crocFrame({ x: 0, y: 0, pitch: 0, L: 3, t: 0, shape: byId("metriorhynchus").shape });
  assert.ok(metro.at(1).y > nile.at(1).y + .1, "tail turns down into the fluke");
  assert.equal(metro.outline(10).length, 22);
});
test("painting is deterministic and the overlays draw", () => {
  const a = fakeCanvas(), b = fakeCanvas();
  for (const t of [3, 10, 45, 80, 130]) { const f = frame(t); paint(a.ctx, 960, 440, f, {}); paint(b.ctx, 960, 440, f, {}); }
  assert.deepEqual(a.ctx.calls, b.ctx.calls);
  const c = fakeCanvas(); scaleInset(c.ctx, 960, 440, byId("purussaurus"), "#fff", "mono"); assert.ok(c.ctx.calls.length > 50);
  assert.equal(sizeChart(c.ctx, 960, 440, frame(DURATION - .1), "mono", 1).length, 14);
  assert.match(light("#812B92"), /^rgb\(/);
});
test("adapters: captions, cards, picking an animal in the chart jumps to its scene", () => {
  const d = deepFilm(), f = frame(10);
  assert.match(d.caption(f).html, /Postosuchus/); assert.match(d.card(f).html, /Postosuchus/);
  assert.match(speciesHTML(byId("voay"), "#fff"), /Madagascar/);
  const end = frame(DURATION - .1); d.paint(fakeCanvas().ctx, 960, 440, end, {});
  assert.equal(d.pick(frame(10), 0, 0), null);
  const h = huntFilm(mulberry32(2)), hf = h.frame(26);
  assert.equal(h.caption(hf).roman, "IV"); h.reset(26); h.advance(26, 26.1);
});
test("the player drives the Origins film and jumps between periods", () => {
  const cv = fakeCanvas(960, 440), box = el("figure");
  const ids = { "dt-c": cv, dt: box, "dt-play": el("button"), "dt-ch": el("div"), "dt-card": el("div"), "dt-roman": el("div"), "dt-body": el("div"), "dt-scrub": el("div"), "dt-time": el("span") };
  const frames = [];
  const api = mountPlayer({ doc: fakeDocument(ids), env: { devicePixelRatio: 1 }, raf: f => frames.push(f), rng: mulberry32(1), prefix: "dt", film: deepFilm, caption: ["dt-roman", "dt-body"] });
  assert.equal(ids["dt-ch"].children.length, 7);
  ids["dt-ch"].children[2].dispatch("click"); assert.equal(ids["dt-roman"].textContent, "III");
  assert.match(ids["dt-body"].innerHTML, /Sarcosuchus/);
  box.dispatch("keydown", { key: "7" }); assert.match(ids["dt-body"].innerHTML, /to scale/i);
  assert.ok(api.state.playing);
});
