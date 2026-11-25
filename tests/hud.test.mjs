import test from "node:test";
import assert from "node:assert/strict";
import { MAX, formatElapsed, formatLeft, hudState, toggleExpanded } from "../js/hud.mjs";
import { mount } from "../js/hud-ui.mjs";

test("formatElapsed: mm:ss under an hour, h:mm:ss after", () => {
  assert.equal(formatElapsed(0), "00:00");
  assert.equal(formatElapsed(9), "00:09");
  assert.equal(formatElapsed(65), "01:05");
  assert.equal(formatElapsed(3599), "59:59");
  assert.equal(formatElapsed(3600), "1:00:00");
  assert.equal(formatElapsed(3661), "1:01:01");
  assert.equal(formatElapsed(36000 + 125), "10:02:05");
});

test("formatLeft: h:mm:ss, Surface at zero", () => {
  assert.equal(formatLeft(7200), "2:00:00");
  assert.equal(formatLeft(7199), "1:59:59");
  assert.equal(formatLeft(61), "0:01:01");
  assert.equal(formatLeft(1), "0:00:01");
  assert.equal(formatLeft(0), "Surface");
});

test("hudState floors to whole seconds and clamps air", () => {
  assert.equal(MAX, 7200);
  assert.deepEqual(hudState(0), { s: 0, left: 7200, time: "00:00", air: "2:00:00", transform: "scaleX(1)" });
  const st = hudState(1999);
  assert.equal(st.s, 1); assert.equal(st.time, "00:01"); assert.equal(st.air, "1:59:59");
  assert.equal(hudState(3600 * 1000).transform, "scaleX(0.5)");
  const done = hudState(9000 * 1000);
  assert.equal(done.left, 0); assert.equal(done.air, "Surface"); assert.equal(done.transform, "scaleX(0)");
  assert.equal(done.time, "2:30:00");
  assert.equal(hudState(5000, 10).transform, "scaleX(0.5)");
});

test("toggleExpanded flips aria-expanded", () => {
  assert.equal(toggleExpanded("true"), "false");
  assert.equal(toggleExpanded("false"), "true");
  assert.equal(toggleExpanded(null), "true");
});

function fakeEl() {
  const attrs = {}, handlers = {};
  return {
    textContent: "", style: {},
    getAttribute: k => (k in attrs ? attrs[k] : null), setAttribute: (k, v) => { attrs[k] = String(v); },
    addEventListener: (type, fn) => { (handlers[type] ||= []).push(fn); },
    fire: type => (handlers[type] || []).forEach(f => f()),
  };
}

test("mount writes the clock, ticks on the injected interval, toggles on click", () => {
  const els = { hud: fakeEl(), "hud-t": fakeEl(), "hud-a": fakeEl(), "hud-bar": fakeEl() };
  els.hud.setAttribute("aria-expanded", "false");
  const doc = { getElementById: id => els[id] || null };
  let clock = 1_000_000, scheduled = null, cleared = null;
  const h = mount({ doc, now: () => clock, setInterval: (f, ms) => { scheduled = { f, ms }; return 42; }, clearInterval: id => { cleared = id; } });
  assert.equal(els["hud-t"].textContent, "00:00");
  assert.equal(els["hud-a"].textContent, "2:00:00");
  assert.equal(els["hud-bar"].style.transform, "scaleX(1)");
  assert.equal(scheduled.ms, 1000);
  clock += 3725_400; scheduled.f();
  assert.equal(els["hud-t"].textContent, "1:02:05");
  assert.equal(els["hud-a"].textContent, "0:57:55");
  clock += 10_000_000; scheduled.f();
  assert.equal(els["hud-a"].textContent, "Surface");
  assert.equal(els["hud-bar"].style.transform, "scaleX(0)");
  els.hud.fire("click"); assert.equal(els.hud.getAttribute("aria-expanded"), "true");
  els.hud.fire("click"); assert.equal(els.hud.getAttribute("aria-expanded"), "false");
  h.stop(); assert.equal(cleared, 42);
});

test("mount does nothing without the HUD markup", () => {
  assert.equal(mount({ doc: { getElementById: () => null }, setInterval: () => assert.fail("no timer") }), null);
});
