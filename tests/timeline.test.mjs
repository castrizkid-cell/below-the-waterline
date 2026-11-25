// Timeline: data, broken scale, label layout, filters, and the UI mounted against the fake DOM.
import test from "node:test";
import assert from "node:assert/strict";
import { el, fakeDocument, all, count } from "./helpers/fake-dom.mjs";
import { CATS, EVENTS, DEFAULT_INDEX, brokenScale, axisTicks, filterEvents, neighbors, layoutLabels } from "../js/timeline.mjs";
import { mount } from "../js/timeline-ui.mjs";

test("data: 13 chronological events with valid categories", () => {
  assert.equal(EVENTS.length, 13);
  assert.deepEqual(Object.keys(CATS), ["culture", "loss", "protection", "science"]);
  EVENTS.forEach((e, i) => {
    assert.ok(CATS[e.cat], `event ${i} category`);
    assert.ok(e.title && e.text && e.label);
    if (e.span != null) assert.ok(e.span > e.y, `${e.title} span ends after it starts`);
    if (i) assert.ok(e.y >= EVENTS[i - 1].y, `${e.title} in order`);
  });
  assert.equal(EVENTS[DEFAULT_INDEX].title, "The hide trade");
  assert.equal(EVENTS[DEFAULT_INDEX].label, "1950 – 1980");
});

test("broken scale: monotonic, continuous at 1800, ~28% before the break", () => {
  const sc = brokenScale({ x0: 0, x1: 1000 });
  assert.equal(sc.x(-500), 0);
  assert.equal(sc.x(2030), 1000);
  assert.ok(Math.abs(sc.breakX - 280) < 1e-9);
  assert.ok(Math.abs(sc.x(1800) - sc.breakX) < 1e-9);
  assert.ok(Math.abs(sc.x(1800 - 1e-6) - sc.x(1800 + 1e-6)) < 1e-3, "continuous at the break");
  let last = -Infinity;
  for (let y = -500; y <= 2030; y += 1) { const x = sc.x(y); assert.ok(x > last, `increasing at ${y}`); last = x; }
  assert.ok(sc.x(1801) - sc.x(1800) > 5 * (sc.x(1799) - sc.x(1798)), "post-break years are wider");
  const ticks = axisTicks(sc);
  assert.ok(ticks.some(t => t.y === 1000 && t.major) && ticks.some(t => t.y === 1960 && !t.major));
});

test("label layout: no overlaps within a row, every label inside the axis", () => {
  const sc = brokenScale({ x0: 40, x1: 1068 });
  const L = layoutLabels(EVENTS, sc);
  assert.equal(L.length, EVENTS.length);
  for (const a of L) {
    assert.ok(a.left >= 40 - 1e-9 && a.right <= 1068 + 1e-9);
    assert.ok(a.ax >= a.left && a.ax <= a.right, "anchor sits under its label");
    for (const b of L) if (a !== b && a.row === b.row) assert.ok(a.right <= b.left || b.right <= a.left, `${EVENTS[a.i].title} vs ${EVENTS[b.i].title}`);
  }
  assert.ok(Math.max(...L.map(l => l.row)) >= 1, "crowded decades stack");
});

test("filters and neighbours", () => {
  assert.equal(filterEvents().length, 13);
  const loss = filterEvents(["loss"]);
  assert.deepEqual(loss.map(e => e.i), [2, 3, 4, 5, 10]);
  assert.ok(loss.every(e => e.cat === "loss"));
  assert.equal(filterEvents(new Set()).length, 0);
  assert.deepEqual(neighbors(5), { prev: 4, next: 6 });
  assert.deepEqual(neighbors(0), { prev: null, next: 1 });
  assert.deepEqual(neighbors(12), { prev: 11, next: null });
  assert.deepEqual(neighbors(5, ["loss"]), { prev: 4, next: 10 });
  assert.deepEqual(neighbors(6, ["loss"]), { prev: 5, next: 10 }, "works from a hidden index");
});

function setup() {
  const ids = { "tl-svg": el("svg"), "tl-filters": el("div"), "tl-year": el("span"), "tl-title": el("h3"), "tl-text": el("p"), "tl-cat": el("span"), "tl-prev": el("button"), "tl-next": el("button") };
  const api = mount({ doc: fakeDocument(ids) });
  const groups = all(ids["tl-svg"]).filter(n => n.attrs["data-i"] != null);
  return { ids, api, groups };
}

test("mount: chips, default card, click, prev/next, filters, keyboard", () => {
  const { ids, api, groups } = setup();
  assert.match(ids["tl-svg"].attrs.viewBox, /^0 0 1100 \d+$/);
  assert.equal(count(ids["tl-filters"], "button"), 4);
  const chips = ids["tl-filters"].children;
  assert.ok(chips.every(c => c.attrs["aria-pressed"] === "true"));
  assert.equal(groups.length, 13);
  assert.equal(count(ids["tl-svg"], "line") > 20, true, "axis ticks drawn");

  assert.equal(ids["tl-title"].textContent, "The hide trade");
  assert.equal(ids["tl-year"].textContent, "1950 – 1980");
  assert.equal(ids["tl-cat"].textContent, "Loss");
  assert.match(groups[5].attrs.class, /tl-selected/);

  groups[0].dispatch("click");
  assert.equal(ids["tl-title"].textContent, "Herodotus");
  assert.equal(ids["tl-cat"].textContent, "Culture");
  assert.ok(ids["tl-prev"].disabled && !ids["tl-next"].disabled);
  assert.doesNotMatch(groups[5].attrs.class, /tl-selected/);

  ids["tl-next"].dispatch("click");
  assert.equal(ids["tl-title"].textContent, "Sobek's temples");
  ids["tl-prev"].dispatch("click");
  assert.equal(ids["tl-title"].textContent, "Herodotus");

  // keyboard
  groups[0].dispatch("keydown", { key: "ArrowRight" });
  assert.equal(api.selected, 1);
  groups[1].dispatch("keydown", { key: "End" });
  assert.equal(ids["tl-title"].textContent, "Least Concern");

  // filter: turn off "culture" and "protection" -> they dim, prev/next skip them
  chips[0].dispatch("click"); chips[2].dispatch("click");
  assert.equal(chips[0].attrs["aria-pressed"], "false");
  assert.equal(groups[0].attrs.opacity, "0.16");
  assert.match(groups[0].attrs.class, /tl-off/);
  assert.notEqual(EVENTS[api.selected].cat, "protection", "selection moved off a hidden category");
  assert.equal(api.selected, 11);
  ids["tl-prev"].dispatch("click");
  assert.equal(ids["tl-title"].textContent, "Olifants River die-off");
  ids["tl-prev"].dispatch("click");
  assert.equal(ids["tl-title"].textContent, "Lake Turkana counted", "skipped Ranching, CITES and Lake Nasser");
  groups[0].dispatch("click");
  assert.equal(ids["tl-title"].textContent, "Lake Turkana counted", "dimmed events cannot be selected");
});

test("mount: missing svg is a no-op", () => {
  assert.equal(mount({ doc: fakeDocument({}) }), null);
});
