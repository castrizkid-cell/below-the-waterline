import test from "node:test";
import assert from "node:assert/strict";
import { CLAIMS, VERDICTS, GUESSES, newQuiz, guess, next, goTo, correct, score, scoreLine, tally, LAYERS, layerAt, PLACES } from "../js/lore.mjs";
import { mount } from "../js/lore-ui.mjs";
import { el, all, fakeDocument } from "./helpers/fake-dom.mjs";

test("twelve claims, each with a source, a verdict and an explanation", () => {
  assert.equal(CLAIMS.length, 12);
  assert.equal(new Set(CLAIMS.map(c => c.id)).size, 12);
  for (const c of CLAIMS) { assert.ok(VERDICTS[c.verdict], c.id); assert.ok(c.who && c.claim && c.text.length > 80, c.id); }
  const t = tally(); assert.equal(t.true + t.partly + t.myth + t.legend, 12);
  assert.ok(t.myth >= 4 && t.true >= 4 && t.partly >= 1 && t.legend >= 1);
});

test("quiz: guess reveals, can't be changed, scores correctly", () => {
  let q = newQuiz();
  assert.match(scoreLine(q), /^12 claims/);
  q = guess(q, "myth"); assert.ok(q.revealed); assert.ok(correct(q, "plover"));
  const again = guess(q, "true"); assert.equal(again, q, "no second guess");
  q = next(q); assert.equal(q.i, 1); assert.equal(q.revealed, false);
  q = guess(q, "true"); assert.ok(!correct(q, "tongue"));
  assert.deepEqual(score(q), { answered: 2, right: 1, total: 12, done: false });
  q = goTo(q, 0); assert.ok(q.revealed, "revisiting an answered claim shows it");
  assert.equal(guess(newQuiz(), "nope").revealed, false);
});

test("a perfect run gets the top line", () => {
  let q = newQuiz();
  CLAIMS.forEach((c, i) => { q = goTo(q, i); q = guess(q, c.verdict); });
  assert.ok(score(q).done); assert.match(scoreLine(q), /^12 of 12/);
});

test("mummy layers and places", () => {
  assert.deepEqual(LAYERS.map(l => l.id), ["linen", "papyri", "bones"]);
  assert.equal(layerAt(9).id, "bones"); assert.equal(layerAt(-1).id, "linen");
  assert.match(LAYERS[1].text, /Tebtunis/);
  assert.equal(PLACES.length, 3);
  assert.equal(PLACES.find(p => p.id === "antanavo").species, "Nile crocodile");
});

test("UI: deck, unwrap slider and place tabs respond", () => {
  const ids = {};
  for (const id of ["lr-card", "lr-who", "lr-claim", "lr-num", "lr-verdict", "lr-text", "lr-score", "lr-you", "lr-guess", "lr-dots", "lr-next", "lr-prev", "lr-mummy", "lr-unwrap", "lr-layer", "lr-layer-text", "lr-places", "lr-p-name", "lr-p-where", "lr-p-sp", "lr-p-text", "lr-place"]) ids[id] = el(id === "lr-mummy" ? "svg" : "div");
  ids["lr-unwrap"].value = "0";
  const ui = mount({ doc: fakeDocument(ids) });
  assert.equal(ids["lr-guess"].children.length, GUESSES.length);
  assert.equal(ids["lr-dots"].children.length, 12);
  assert.match(ids["lr-claim"].textContent, /bird/);
  ids["lr-guess"].children.find(b => b.dataset.g === "myth").dispatch("click");
  assert.equal(ids["lr-verdict"].textContent, "Myth");
  assert.equal(ids["lr-you"].textContent, "You called it.");
  ids["lr-next"].dispatch("click"); assert.match(ids["lr-claim"].textContent, /tongue/);
  ids["lr-unwrap"].value = "1"; ids["lr-unwrap"].dispatch("input");
  assert.equal(ids["lr-layer"].textContent, "Reused papyri");
  ids["lr-places"].children[2].dispatch("click");
  assert.equal(ids["lr-p-name"].textContent, "Lake Antañavo");
  assert.ok(all(ids["lr-mummy"]).length > 40, "mummy drawn");
  assert.equal(ui.quiz.i, 1);
});
