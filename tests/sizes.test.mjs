import test from "node:test";
import assert from "node:assert/strict";
import { personPath, sideDetails, DATA, IDS, all, order, reaching, tapeLine, snapTape, massKg, peopleFor, beamAngle, balanceText, sidePath, sideLegs, headPath, headWidth, headEyes, plateScale, PRESETS } from "../js/sizes.mjs";
import { SPECIES } from "../js/origins.mjs";

test("covers exactly the twelve species in the family tree", () => {
  assert.equal(IDS.length, 12);
  assert.deepEqual([...IDS].sort(), Object.keys(SPECIES).sort());
});

test("every range is sane: typical within max, max agrees with the species card", () => {
  for (const s of all()) {
    assert.ok(s.typ[0] < s.typ[1] && s.typ[1] <= s.max, s.id);
    assert.ok(Math.abs(s.max - SPECIES[s.id].len) <= .25, `${s.id} max ${s.max} vs card ${SPECIES[s.id].len}`);
    assert.ok(s.snout > .3 && s.snout < 1.7);
  }
});

test("orderings are permutations; length puts the saltwater crocodile first", () => {
  for (const m of ["length", "family", "region", "snout"]) assert.deepEqual([...order(m)].sort(), [...IDS].sort(), m);
  assert.equal(order("length")[0], "porosus");
  assert.equal(order("family")[0], "niloticus");
  assert.equal(order("snout")[0], "johnstoni");
  assert.equal(order("snout").at(-1), "palustris");
});

test("the tape counts species that reach a length", () => {
  assert.equal(reaching(1.75).length, 12);
  assert.deepEqual(reaching(6.0), ["porosus"]);
  assert.equal(reaching(6.5).length, 0);
  assert.equal(tapeLine(4.6), `${reaching(4.6).length} of 12 species reach 4.60 m`);
  assert.equal(tapeLine(1), "Every species reaches 1.00 m");
  assert.equal(snapTape(4.637), 4.65);
  assert.equal(snapTape(99), 6.5);
  assert.ok(PRESETS.every(p => p.m > 0 && p.m < 6.5));
});

test("weight: cube law lands near Lolong's measured 1,075 kg", () => {
  assert.ok(Math.abs(massKg(6.17) - 1075) < 60);
  assert.ok(massKg(6) / massKg(3) === 8);
  assert.equal(peopleFor(3), 2);
  assert.equal(peopleFor(6.17), 15);
});

test("balance tips toward the heavier side and reads level when matched", () => {
  assert.ok(beamAngle(5, 1) > 0);
  assert.ok(beamAngle(5, 40) < 0);
  assert.equal(beamAngle(5, peopleFor(5)), 0);
  assert.match(balanceText(5, peopleFor(5)), /^Level\. 8 people ≈ 550 kg/);
  assert.match(balanceText(5, 1), /Add people/);
});

test("geometry: closed paths, snout breadth widens the snout only", () => {
  const d = sidePath(0, 50, 600);
  assert.ok(d.startsWith("M") && d.endsWith("Z"));
  assert.equal(sideLegs(0, 50, 600).length, 2);
  assert.ok(headWidth(.03, 1.5) > headWidth(.03, 1) && headWidth(.03, .5) < headWidth(.03, 1));
  assert.equal(headWidth(1, 1.5), headWidth(1, 1));
  assert.ok(headWidth(.84, 1) > headWidth(.1, 1) * 2.5, "skull widens toward the back");
  assert.ok(headPath(50, 0, 100, 1).endsWith("Z"));
  const [[lx], [rx]] = headEyes(50, 0, 100); assert.ok(lx < 50 && rx > 50);
  const sc = plateScale(100, 750, 6.5);
  assert.equal(sc.px(0), 100); assert.equal(sc.px(6.5), 750); assert.equal(sc.m(425), 3.25);
});

test("person and details geometry", () => {
  const p = personPath(0, 50, 100);
  assert.ok(p.body.endsWith("Z")); assert.equal(p.head[0], 164);
  const d = sideDetails(0, 50, 500); assert.ok(d.jaw.startsWith("M") && d.crest.length > 0); assert.ok(d.eye[0] > 400);
});

test("size ranking matches the literature: saltwater > Nile > Orinoco > American", () => {
  const m = id => DATA[id].max, t = id => DATA[id].typ[1];
  assert.ok(m("porosus") > m("niloticus"));
  assert.ok(m("niloticus") > m("intermedius") && m("niloticus") > m("acutus"), "Nile is larger than the American and Orinoco crocodiles");
  assert.ok(t("niloticus") >= t("acutus"));
  assert.deepEqual(order("length").slice(0, 4), ["porosus", "niloticus", "intermedius", "acutus"]);
});

test("skin: every species has colouring and a matching pattern", async () => {
  const { SKIN, crossbands, spots, teeth, topEdge, eyeAt, scutes } = await import("../js/sizes.mjs");
  assert.deepEqual(Object.keys(SKIN).sort(), [...IDS].sort());
  for (const [id, k] of Object.entries(SKIN)) {
    for (const c of [k.back, k.flank, k.belly, k.band]) assert.match(c, /^#[0-9a-f]{6}$/, id);
    assert.ok(["bands", "blotch", "speckle", "plain"].includes(k.pattern));
    assert.ok(k.note.length > 20);
  }
  assert.equal(SKIN.rhombifer.pattern, "speckle"); // the Cuban crocodile's yellow speckles
  assert.equal((crossbands(0, 50, 500, 10).match(/Z/g) || []).length, 10);
  assert.equal(crossbands(0, 50, 500, 0), "");
  assert.equal(spots(0, 50, 500, "speckle").length, 140);
  assert.deepEqual(spots(0, 50, 500, "blotch", 3), spots(0, 50, 500, "blotch", 3)); // deterministic
  assert.equal(spots(0, 50, 500, "plain").length, 0);
  assert.ok(teeth(0, 50, 500).split("Z").length > 6);
  assert.ok(scutes(0, 50, 500).length > 60);
  assert.ok(topEdge(0, 50, 500).startsWith("M"));
  const [ex, ey] = eyeAt(0, 50, 500); assert.ok(ex > 400 && ey < 50);
});
