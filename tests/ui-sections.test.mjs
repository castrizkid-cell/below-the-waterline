// Hero, reaction test and grow UI modules mounted against a fake DOM with an injected clock.
import test from "node:test";
import assert from "node:assert/strict";
import { el, fakeDocument, fakeCanvas, FakePath2D } from "./helpers/fake-dom.mjs";
import { mount as mountHero } from "../js/hero-ui.mjs";
import { mount as mountEdge } from "../js/edge-ui.mjs";
import { mount as mountGrow } from "../js/grow-ui.mjs";
import { mulberry32 } from "../js/rng.mjs";
import { COLORS as palette } from "../js/palette.mjs";

const env = (extra = {}) => ({ innerHeight: 900, devicePixelRatio: 1, matchMedia: () => ({ matches: false }), Path2D: FakePath2D, addEventListener() {}, ...extra });
const clock = () => { let t = 0; const q = []; return { now: () => t, raf: f => q.push(f), run(n = 1, dt = 16) { for (let i = 0; i < n; i++) { t += dt; const f = q.shift(); f && f(t); } }, q }; };

test("hero mounts and renders frames", () => {
  const cv = fakeCanvas(1200, 800), wrap = el("div"); cv.parentElement = wrap;
  const h1 = el("h1"), lede = el("p"); h1.parentElement = { querySelector: sel => (sel === ".lede" ? lede : null) };
  const ids = { surface: el("section", { getBoundingClientRect: () => ({ top: 0, bottom: 2000, height: 2000 }) }), "hero-c": cv, "hero-under": el("div"), cue: el("div"), "hero-h": h1 };
  const c = clock();
  mountHero({ doc: fakeDocument(ids), env: env(), now: c.now, raf: c.raf, rng: mulberry32(1) });
  c.run(3);
  assert.ok(cv.ctx.calls.length > 100, "drew the scene");
  assert.equal(c.q.length, 1, "one frame scheduled");
});

test("reaction test: press starts a round, the injected clock drives it", () => {
  const box = el("div", { getBoundingClientRect: () => ({ top: 0, bottom: 400, height: 400 }) });
  const ids = { "edge-box": box, "edge-c": fakeCanvas(800, 500), "edge-big": el("div"), "edge-small": el("div"), best: el("b"), last: el("b"), caught: el("b") };
  const c = clock();
  mountEdge({ doc: fakeDocument(ids), env: env(), now: c.now, raf: c.raf, rng: mulberry32(2) });
  c.run(1);
  const before = ids["edge-big"].textContent;
  box.dispatch("pointerdown");
  c.run(1);
  assert.notEqual(ids["edge-big"].textContent, before, "pressing changes the message");
  c.run(800, 16); // ~13 s of fake time, no real waiting
  assert.ok(ids.caught.textContent !== "" || ids.last.textContent !== "", "round resolved");
});

test("grow: slider input updates readouts and greys out diet items", () => {
  const input = el("input", { value: "4.5" });
  const lis = [["0", "1"], ["2.8", "6"]].map(([min, max]) => el("li", { dataset: { min, max } }));
  const ids = { len: input, "grow-c": fakeCanvas(1000, 380), "g-len": el("span"), "g-kg": el("span"), "g-stage": el("span") };
  const c = clock();
  mountGrow({ doc: fakeDocument(ids, { "#g-eat li, #g-pred li": lis }), env: env(), now: c.now, raf: c.raf });
  assert.match(ids["g-len"].textContent, /4\.50 m/);
  assert.ok(lis[0].classList.contains("gray") && !lis[1].classList.contains("gray"));
  input.value = "0.5"; input.dispatch("input");
  assert.match(ids["g-len"].textContent, /0\.50 m/);
  assert.ok(!lis[0].classList.contains("gray") && lis[1].classList.contains("gray"));
  assert.ok(palette.iris);
});
