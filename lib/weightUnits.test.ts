import test from "node:test";
import assert from "node:assert/strict";
import { formatWeight, toDisplayValue } from "./weightUnits";

test("converts kg to pounds by rounding up to whole pounds", () => {
  assert.equal(toDisplayValue(2.2, "lb"), 5);
  assert.equal(formatWeight(2.2, "lb"), "5lb");
});

test("keeps kilograms in kg and rounds up to whole numbers", () => {
  assert.equal(toDisplayValue(2.2, "kg"), 3);
  assert.equal(formatWeight(2.2, "kg"), "3kg");
});
