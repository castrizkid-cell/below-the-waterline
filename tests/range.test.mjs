import test from "node:test";
import assert from "node:assert/strict";
import { STATUS, LABEL, COLOR, statusOf, PLACES, project, wrapIndex, coordsText, tagHTML, creditText, imgAlt,
  labelPos, ringDelay, toggleFilter, countryAttrs, countryTitle, riverClass, FALLBACK } from "../js/range.mjs";
import { mount } from "../js/range-ui.mjs";

test("every status has a label and colour; ISO codes are unique", () => {
  for (const k of Object.keys(STATUS)) { assert.ok(LABEL[k]); assert.match(COLOR[k], /^#[0-9a-f]{6}$/); }
  const all = Object.values(STATUS).flat();
  assert.equal(new Set(all).size, all.length);
  assert.equal(Object.keys(statusOf).length, all.length);
  assert.equal(statusOf.KEN, "strong"); assert.equal(statusOf.MDG, "depleted"); assert.equal(statusOf.NGA, "suchus");
});

test("places are well formed and inside the map viewBox", () => {
  assert.equal(PLACES.length, 12);
  for (const p of PLACES) {
    assert.ok(p.n && p.c && p.t && LABEL[p.s], p.n);
    if (p.img) assert.ok(p.cr, p.n);
    const [x, y] = project(p.lon, p.lat);
    assert.ok(x >= 20 && x <= 720 && y >= 40 && y <= 775, p.n);
  }
});

test("projection", () => {
  assert.deepEqual(project(-18, 38.5), [0, 0]);
  assert.deepEqual(project(0, 0), [180, 385]);
  const [x, y] = project(35.05, -1.45); assert.ok(Math.abs(x - 530.5) < 1e-9 && Math.abs(y - 399.5) < 1e-9);
});

test("wrapIndex wraps both ways", () => {
  assert.equal(wrapIndex(0, 12), 0); assert.equal(wrapIndex(-1, 12), 11);
  assert.equal(wrapIndex(12, 12), 0); assert.equal(wrapIndex(25, 12), 1); assert.equal(wrapIndex(-13, 12), 11);
});

test("text formatting", () => {
  assert.equal(coordsText(PLACES[0]), "1.45° S  ·  35.05° E  ·  Kenya · Tanzania");
  assert.equal(coordsText(PLACES[1]), "3.55° N  ·  36.10° E  ·  Kenya");
  assert.equal(tagHTML("strong"), '<i style="background:#7f9b5e"></i>Stronghold');
  assert.equal(creditText(PLACES[0]), "Photo: Diego Delso · CC BY-SA 4.0");
  assert.equal(creditText(PLACES[1]), "");
  assert.equal(imgAlt(PLACES[0]), "Nile crocodile at Mara River");
});

test("labels flip east of 40°E; ring delays stagger", () => {
  assert.deepEqual(labelPos({ lon: 49.1 }), { x: -10, anchor: "end" });
  assert.deepEqual(labelPos({ lon: 40 }), { x: 10, anchor: "start" });
  assert.equal(ringDelay(0, 0), 0); assert.equal(ringDelay(1, 2), 2080);
});

test("filter toggles on and off", () => {
  assert.equal(toggleFilter(null, "strong"), "strong");
  assert.equal(toggleFilter("strong", "strong"), null);
  assert.equal(toggleFilter("strong", "gone"), "gone");
});

test("country and river attributes", () => {
  assert.deepEqual(countryAttrs({ iso: "KEN", d: "M0", africa: true }), { d: "M0", class: "land", "data-s": "strong" });
  assert.deepEqual(countryAttrs({ iso: "LBY", d: "M1", africa: true }), { d: "M1", class: "land" });
  assert.deepEqual(countryAttrs({ iso: "ISR", d: "M2" }), { d: "M2", class: "land", "data-s": "gone" });
  assert.deepEqual(countryAttrs({ iso: "FRA", d: "M3" }), { d: "M3", class: "land out" });
  assert.equal(countryTitle({ iso: "KEN", name: "Kenya" }), "Kenya · Stronghold");
  assert.equal(countryTitle({ iso: "FRA", name: "France" }), "France");
  assert.equal(riverClass({ name: "White Nile" }), "river nile");
  assert.equal(riverClass({ name: "Congo" }), "river");
});

/* ---------- tiny fake DOM ---------- */
class FakeEl {
  constructor(tag, id) {
    this.tag = tag; this.id = id; this.attrs = {}; this.children = []; this.listeners = {}; this.anims = [];
    this.textContent = ""; this.innerHTML = ""; this.hidden = false; this.dataset = {}; this.cls = new Set();
    const self = this;
    this.classList = {
      add: c => self.cls.add(c), remove: c => self.cls.delete(c), contains: c => self.cls.has(c),
      toggle: (c, on) => { (on ?? !self.cls.has(c)) ? self.cls.add(c) : self.cls.delete(c); },
    };
  }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === "class") String(v).split(" ").forEach(c => this.cls.add(c)); if (k.startsWith("data-")) this.dataset[k.slice(5)] = String(v); }
  appendChild(c) { if (c.tag === "#frag") { this.children.push(...c.children); c.children = []; } else this.children.push(c); return c; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  fire(t, e = {}) { (this.listeners[t] || []).forEach(f => f(e)); }
  animate(k, o) { this.anims.push({ k, o }); }
  all() { return this.children.flatMap(c => [c, ...c.all()]); }
  querySelector(s) { return this.querySelectorAll(s)[0] || null; }
  querySelectorAll(s) {
    if (s.startsWith("#")) return this.all().filter(e => e.id === s.slice(1));
    if (s.startsWith(".")) return this.all().filter(e => e.cls.has(s.slice(1)));
    return [];
  }
}
function fakeDoc() {
  const svg = new FakeEl("svg", "map");
  for (const id of ["m-land", "m-lakes", "m-rivers", "m-hot"]) svg.appendChild(new FakeEl("g", id));
  const ids = {}; ["pl-img", "pl-fig", "pl-body", "pl-coords", "pl-name", "pl-tag", "pl-text", "pl-credit", "pl-prev", "pl-next"].forEach(i => ids[i] = new FakeEl("x", i));
  ids.map = svg;
  const legend = Object.keys(STATUS).map(s => { const b = new FakeEl("button"); b.dataset.s = s; return b; });
  return {
    svg, ids, legend,
    getElementById: id => ids[id] || null,
    querySelectorAll: s => (s === "#legend button" ? legend : []),
    createElementNS: (ns, t) => { assert.equal(ns, "http://www.w3.org/2000/svg"); return new FakeEl(t); },
    createDocumentFragment: () => new FakeEl("#frag"),
  };
}
const GEO = {
  countries: [{ iso: "KEN", name: "Kenya", africa: true, d: "M0 0L1 1Z" }, { iso: "FRA", name: "France", d: "M2 2Z" }],
  lakes: [{ d: "M3 3Z" }],
  rivers: [{ name: "White Nile", d: "M4 4" }, { name: "Congo", d: "M5 5" }],
};
function setup({ rm = false, fetch = async () => ({ json: async () => GEO }) } = {}) {
  const doc = fakeDoc(), timers = [], urls = [];
  const env = { matchMedia: () => ({ matches: rm }) };
  const h = mount({ doc, env, fetch: u => { urls.push(u); return fetch(u); }, setTimeout: (f, ms) => timers.push({ f, ms }) });
  const flush = () => { while (timers.length) timers.shift().f(); };
  return { doc, h, timers, urls, flush };
}

test("mount draws hotspots and shows the first place", () => {
  const { doc, h, timers, urls, flush } = setup();
  const hot = doc.svg.querySelector("#m-hot");
  assert.equal(hot.children.length, PLACES.length);
  const g0 = hot.children[0];
  assert.equal(g0.attrs.transform, "translate(530.5 399.5)");
  assert.equal(g0.attrs["aria-label"], "Mara River");
  assert.equal(g0.children.length, 5);
  assert.equal(g0.children[1].anims[0].o.delay, 0);
  assert.equal(hot.children[1].children[2].anims[0].o.delay, 1840);
  assert.equal(hot.children[11].children[4].attrs["text-anchor"], "end");
  assert.ok(g0.cls.has("on") && !hot.children[1].cls.has("on"));
  assert.deepEqual(urls, ["geo.json"]);
  assert.equal(timers.length, 1); assert.equal(timers[0].ms, 200);
  assert.ok(doc.ids["pl-body"].cls.has("out"));
  flush();
  assert.ok(!doc.ids["pl-body"].cls.has("out"));
  assert.equal(doc.ids["pl-name"].textContent, "Mara River");
  assert.equal(doc.ids["pl-tag"].innerHTML, tagHTML("strong"));
  assert.equal(doc.ids["pl-img"].src, "img/sandbar.jpg");
  assert.equal(doc.ids["pl-fig"].hidden, false);
  assert.equal(h.index, 0);
});

test("prev/next and hotspot click/keys navigate with wrapping", () => {
  const { doc, h, flush } = setup();
  doc.ids["pl-prev"].fire("click"); flush();
  assert.equal(h.index, 11); assert.equal(doc.ids["pl-name"].textContent, "Ankarana");
  assert.equal(doc.ids["pl-fig"].hidden, true); assert.equal(doc.ids["pl-credit"].textContent, "");
  doc.ids["pl-next"].fire("click"); flush(); assert.equal(h.index, 0);
  const hot = doc.svg.querySelector("#m-hot");
  hot.children[3].fire("click"); flush(); assert.equal(h.index, 3);
  assert.ok(hot.children[3].cls.has("on") && !hot.children[0].cls.has("on"));
  let prevented = false;
  hot.children[5].fire("keydown", { key: "Enter", preventDefault: () => prevented = true }); assert.ok(prevented); assert.equal(h.index, 5);
  hot.children[6].fire("keydown", { key: "a", preventDefault: () => assert.fail() }); assert.equal(h.index, 5);
});

test("geo data renders and legend filters it", async () => {
  const { doc, h } = setup();
  assert.equal(await h.ready, true);
  const land = doc.svg.querySelector("#m-land").children;
  assert.equal(land.length, 2);
  assert.equal(land[0].attrs["data-s"], "strong"); assert.equal(land[0].children[0].textContent, "Kenya · Stronghold");
  assert.equal(land[1].attrs.class, "land out");
  assert.equal(doc.svg.querySelector("#m-lakes").children[0].attrs.class, "lake");
  assert.deepEqual(doc.svg.querySelector("#m-rivers").children.map(r => r.attrs.class), ["river nile", "river"]);
  const strong = doc.legend[0];
  strong.fire("click");
  assert.equal(h.filter, "strong"); assert.ok(doc.svg.cls.has("focus"));
  assert.equal(strong.attrs["aria-pressed"], "true"); assert.equal(doc.legend[1].attrs["aria-pressed"], "false");
  assert.ok(land[0].cls.has("hl") && !land[1].cls.has("hl"));
  strong.fire("click");
  assert.equal(h.filter, null); assert.ok(!doc.svg.cls.has("focus")); assert.ok(!land[0].cls.has("hl"));
});

test("reduced motion: no ring animation, instant swap", () => {
  const { doc, timers } = setup({ rm: true });
  assert.equal(doc.svg.querySelector("#m-hot").children[0].children[1].anims.length, 0);
  assert.equal(timers[0].ms, 0);
});

test("failed fetch shows the fallback message", async () => {
  const { doc, h } = setup({ fetch: async () => { throw new Error("offline"); } });
  assert.equal(await h.ready, false);
  const t = doc.svg.querySelector("#m-land").children[0];
  assert.equal(t.tag, "text"); assert.equal(t.textContent, FALLBACK.text); assert.equal(t.attrs.x, "370");
});
