import test from "node:test";
import assert from "node:assert/strict";
import { scale, periodAt, formatMa, ticks, layoutBranches, layoutTree, validate, CROC_TREE, BRANCHES, SPINE } from "../js/origins.mjs";

test("data is internally consistent", () => {
  assert.deepEqual(validate(), []);
});

test("scale maps and inverts", () => {
  const x = scale([260, 0], [0, 1300]);
  assert.equal(x(260), 0);
  assert.equal(x(0), 1300);
  assert.equal(x(130), 650);
  assert.equal(x.invert(650), 130);
});

test("periodAt finds the right period", () => {
  assert.equal(periodAt(230).name, "Triassic");
  assert.equal(periodAt(100).name, "Cretaceous");
  assert.equal(periodAt(1).name, "Quaternary");
  assert.equal(periodAt(999), null);
});

test("formatMa reads naturally", () => {
  assert.equal(formatMa(0), "Today");
  assert.equal(formatMa(0.5), "500 thousand years ago");
  assert.equal(formatMa(6.04), "6.0 million years ago");
  assert.equal(formatMa(201.4), "201 million years ago");
});

test("ticks step down from the start", () => {
  assert.deepEqual(ticks(260, 0, 50), [250, 200, 150, 100, 50, 0]);
});

test("branches are ordered so connectors never cross", () => {
  const { rows, spineRow } = layoutBranches();
  assert.equal(spineRow, BRANCHES.length);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i].from <= rows[i - 1].from);
});

test("every branch leaves the thread after the thread exists", () => {
  for (const b of BRANCHES) assert.ok(b.from <= 251 || b.id === "phyto");
  assert.ok(SPINE.at(-1).at < Math.min(...BRANCHES.filter(b => b.id !== "afr").map(b => b.from)));
});

test("cladogram layout puts inner nodes between their children", () => {
  const out = layoutTree(CROC_TREE);
  assert.equal(out.tips.length, 12);
  for (const n of out.nodes.filter(n => !n.tip)) {
    const ys = n.kids.map(k => k.y);
    assert.ok(n.y >= Math.min(...ys) && n.y <= Math.max(...ys));
    for (const k of n.kids) assert.ok(k.at < n.at);
  }
});
