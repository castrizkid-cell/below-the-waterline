// Hero, reaction test and grow UI modules mounted against a fake DOM with an injected clock.
import test from "node:test";
import assert from "node:assert/strict";
import { el, fakeDocument, fakeCanvas, FakePath2D } from "./helpers/fake-dom.mjs";
import { mount as mountHero } from "../js/hero-ui.mjs";
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

test("sizes: drawer, tape, sort, balance and heads all respond", async () => {
  const { mount: mountSizes } = await import("../js/sizes-ui.mjs");
  const { peopleFor, species, reaching } = await import("../js/sizes.mjs");
  const ids = {};
  for (const id of ["sz-drawer", "sz-balance", "sz-over"]) ids[id] = el("svg", { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1100, height: 900 }) });
  for (const id of ["sz-read", "sz-sentence", "sz-presets", "sz-name", "sz-latin", "sz-where", "sz-typ", "sz-max", "sz-kg", "sz-note", "sz-fact", "sz-bal-text", "sz-bal-n", "sz-bal-for", "sz-minus", "sz-plus", "sz-heads", "sz-over-text"]) ids[id] = el("div");
  const sortBtns = ["length", "family", "region", "snout"].map(s => el("button", { dataset: { sort: s } }));
  const ui = mountSizes({ doc: fakeDocument(ids, { "#sz-sort button": sortBtns }) });
  assert.equal(ids["sz-name"].textContent, "Nile crocodile");
  assert.equal(ids["sz-presets"].children.length, 4);
  ids["sz-presets"].children[0].dispatch("click"); // "You · 1.75 m"
  assert.equal(ui.tape, 1.75);
  assert.equal(ids["sz-sentence"].textContent, "Every species reaches 1.75 m");
  ids["sz-drawer"].dispatch("pointerdown", { clientX: 1076, pointerId: 1 }); // far right of the ruler = 6.5 m
  assert.equal(ui.tape, 6.5);
  ui.setTape(6.0); assert.match(ids["sz-sentence"].textContent, new RegExp(`^${reaching(6).length} of 12`));
  sortBtns[1].dispatch("click"); assert.equal(sortBtns[1].attrs["aria-pressed"], "true");
  ids["sz-heads"].children[0].dispatch("click"); // narrowest snout first
  assert.equal(ids["sz-name"].textContent, "Freshwater crocodile");
  const need = peopleFor(species("johnstoni").typ[1]);
  for (let i = 1; i < need; i++) ids["sz-plus"].dispatch("click");
  assert.match(ids["sz-bal-text"].textContent, /^Level\./);
  assert.ok(ids["sz-balance"].classList.contains("level"));
});
