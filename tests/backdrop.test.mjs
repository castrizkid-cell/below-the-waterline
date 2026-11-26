import test from "node:test";
import assert from "node:assert/strict";
import { scuteTile, dataUri, activeSection, drift, lightAt } from "../js/backdrop.mjs";
import { mount } from "../js/backdrop-ui.mjs";
import { el, fakeDocument } from "./helpers/fake-dom.mjs";

test("armour tile: 4 + 5 keeled plates, offset rows, valid data URI", () => {
  const svg = scuteTile();
  assert.equal((svg.match(/<rect /g) || []).length, 9);
  assert.equal((svg.match(/<path /g) || []).length, 9, "every plate has a keel");
  assert.match(dataUri(svg), /^url\("data:image\/svg\+xml,%3Csvg/);
});

test("active section, drift and light", () => {
  assert.equal(activeSection([0, 500, 1500], 1000), 0);
  assert.equal(activeSection([0, 300, 1500], 1000), 1);
  assert.equal(activeSection([-3000, -1200, 100], 1000), 2);
  assert.equal(drift(0), -0); assert.ok(drift(500) < 0 && drift(500) > -84);
  assert.equal(lightAt(0, 1000), 1); assert.equal(lightAt(1000, 1000), .55);
});

test("UI tints by the section on screen and drifts with scroll", () => {
  const root = el("html"); const st = {}; root.style = { setProperty: (k, v) => { st[k] = v; } };
  const secs = [0, 1, 2].map(i => el("section", { getBoundingClientRect: () => ({ top: [-2000, 200, 1500][i] }) }));
  const bdEl = el("div"); bdEl.querySelector = () => ({ set innerHTML(v) { bdEl.armour = v; } });
  const doc = { ...fakeDocument({ backdrop: bdEl }, { "#surface, section.sect, #hunt": secs }), documentElement: root, body: { scrollHeight: 10000 } };
  const accs = ["#111111", "#b98ad0", "#8fb36a"];
  const env = { scrollY: 1000, innerHeight: 900, matchMedia: () => ({ matches: false }), getComputedStyle: s => ({ getPropertyValue: () => accs[secs.indexOf(s)] }), addEventListener() {} };
  const ui = mount({ doc, env, raf: f => f() });
  assert.equal(ui.active, 1);
  assert.equal(st["--bd-acc"], "#b98ad0");
  assert.match(bdEl.armour, /bd-armour/);
  assert.match(st["--bd-y"], /^-\d+(\.\d)?px$/);
});

test("armour svg is a repeating pattern drawn in currentColor", async () => {
  const { armourSvg } = await import("../js/backdrop.mjs");
  const s = armourSvg();
  assert.match(s, /<pattern id="bd-armour" width="232" height="84"/);
  assert.ok(s.includes('stroke="currentColor"') && !s.includes('"#000"'));
});
