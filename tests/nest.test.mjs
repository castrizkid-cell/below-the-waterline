import test from "node:test";
import assert from "node:assert/strict";
import { EGG_COUNT, sig, maleFrac, eggThresholds, formatTemp, outcome, eggSexes, nestState } from "../js/nest.mjs";
import { mount } from "../js/nest-ui.mjs";

test("sig is a logistic curve", () => {
  assert.equal(sig(0), .5);
  assert.ok(sig(10) > .9999 && sig(-10) < .0001);
});

test("maleFrac peaks between 31.7 and 34.5 and falls off both sides", () => {
  assert.ok(maleFrac(33) > .9 && maleFrac(33) < .97);
  assert.ok(maleFrac(29) < .001);
  assert.ok(maleFrac(36) < .01 && maleFrac(37) < .001);
  assert.ok(Math.abs(maleFrac(31.7) - .97 * .5 * sig((34.5 - 31.7) / .3)) < 1e-12);
  assert.ok(maleFrac(31) < maleFrac(31.5) && maleFrac(31.5) < maleFrac(32));
  assert.ok(maleFrac(34) > maleFrac(34.5) && maleFrac(34.5) > maleFrac(35));
});

test("eggThresholds: 50 distinct values covering (0,1]", () => {
  const r = eggThresholds();
  assert.equal(r.length, EGG_COUNT);
  assert.equal(new Set(r).size, 50);
  assert.equal(r[0], .01);
  assert.ok(Math.abs(r[1] - (7919 % 50) / 50 - .01) < 1e-12);
  assert.ok(Math.min(...r) >= .01 && Math.max(...r) <= .99 + 1e-12);
  const sorted = [...r].sort((a, b) => a - b);
  sorted.forEach((v, i) => assert.ok(Math.abs(v - (i / 50 + .01)) < 1e-12));
});

test("formatTemp and outcome labels", () => {
  assert.equal(formatTemp(31), "31.0°");
  assert.equal(formatTemp(33.26), "33.3°");
  assert.equal(outcome(29), "All females, cool nest");
  assert.equal(outcome(36), "All females, hot nest");
  assert.equal(outcome(33), "Mostly males");
  assert.equal(outcome(31.7), "Mixed clutch");
  assert.equal(outcome(31.9, .1), "All females, cool nest");
  assert.equal(outcome(32, .1), "All females, hot nest");
  assert.equal(outcome(30, .5), "Mixed clutch");
  assert.equal(outcome(30, .81), "Mostly males");
});

test("eggSexes and nestState agree with the fraction", () => {
  assert.deepEqual(eggSexes([.1, .5, .9], .5), [true, false, false]);
  const r = eggThresholds();
  assert.equal(nestState(29, r).males.filter(Boolean).length, 0);
  const hot = nestState(33, r);
  assert.equal(hot.read, "33.0°"); assert.equal(hot.out, "Mostly males");
  assert.equal(hot.males.filter(Boolean).length, r.filter(x => x < hot.male).length);
  assert.ok(hot.males.filter(Boolean).length >= 45);
});

function fakeClassList() {
  const s = new Set();
  return { set: s, add: c => s.add(c), contains: c => s.has(c), toggle: (c, on) => { on ? s.add(c) : s.delete(c); return on; } };
}
function fakeEl() {
  const handlers = {};
  return {
    textContent: "", value: "", className: "", children: [], classList: fakeClassList(),
    appendChild(c) { this.children.push(c); return c; },
    addEventListener: (type, fn) => { (handlers[type] ||= []).push(fn); },
    fire: type => (handlers[type] || []).forEach(f => f()),
  };
}

test("mount builds 50 eggs and updates on input", () => {
  const els = { temp: fakeEl(), "t-read": fakeEl(), "t-out": fakeEl(), clutch: fakeEl() };
  els.temp.value = "30";
  const doc = { getElementById: id => els[id] || null, createElement: tag => { assert.equal(tag, "div"); return fakeEl(); } };
  const n = mount({ doc });
  const eggs = els.clutch.children;
  assert.equal(eggs.length, 50);
  assert.ok(eggs.every(e => e.className === "egg"));
  assert.equal(els["t-read"].textContent, "30.0°");
  assert.equal(els["t-out"].textContent, "All females, cool nest");
  assert.ok(eggs.every(e => e.classList.contains("f") && !e.classList.contains("m")));
  els.temp.value = "33"; els.temp.fire("input");
  assert.equal(els["t-read"].textContent, "33.0°");
  assert.equal(els["t-out"].textContent, "Mostly males");
  const r = eggThresholds(), m = maleFrac(33);
  eggs.forEach((e, i) => { assert.equal(e.classList.contains("m"), r[i] < m); assert.equal(e.classList.contains("f"), !(r[i] < m)); });
  els.temp.value = "36"; els.temp.fire("input");
  assert.equal(els["t-out"].textContent, "All females, hot nest");
  assert.equal(n.eggs.length, 50);
});

test("mount does nothing without the nest markup", () => {
  assert.equal(mount({ doc: { getElementById: () => null } }), null);
});
