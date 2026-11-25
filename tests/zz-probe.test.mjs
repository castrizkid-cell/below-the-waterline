import test from "node:test";
import assert from "node:assert/strict";
test("deliberately failing probe", () => assert.equal(1 + 1, 3));
