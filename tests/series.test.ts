import test from "node:test";
import assert from "node:assert/strict";
import { parseSeriesFromTitle, normalizeSeries } from "@/lib/series";

test("parses '(Series, Book N)'", () => {
  assert.deepEqual(parseSeriesFromTitle("Die Trying (Jack Reacher, Book 2)"), {
    series: "Jack Reacher",
    seriesIndex: 2,
  });
});

test("parses '(Series Series Book N)' and strips the trailing 'Series'", () => {
  assert.deepEqual(parseSeriesFromTitle("Red Rising (Red Rising Series Book 1)"), {
    series: "Red Rising",
    seriesIndex: 1,
  });
});

test("parses '(Series N)' with a bare trailing number", () => {
  assert.deepEqual(
    parseSeriesFromTitle("Battle for Skandia_ Book Four (Ranger's Apprentice 4)"),
    { series: "Ranger's Apprentice", seriesIndex: 4 },
  );
});

test("keeps a descriptive series word and strips the leading article", () => {
  assert.deepEqual(
    parseSeriesFromTitle("Catching Fire (Hunger Games Trilogy, Book 2)"),
    { series: "Hunger Games Trilogy", seriesIndex: 2 },
  );
});

test("groups a no-number series volume (index null) consistently", () => {
  assert.deepEqual(parseSeriesFromTitle("Shadows of Self_ 5 (The Mistborn Saga)"), {
    series: "Mistborn Saga",
    seriesIndex: null,
  });
  assert.deepEqual(parseSeriesFromTitle("Alloy of Law (The Mistborn Saga), The"), {
    series: "Mistborn Saga",
    seriesIndex: null,
  });
});

test("returns null when there's no parenthetical series", () => {
  assert.equal(parseSeriesFromTitle("Greenlights"), null);
  assert.equal(parseSeriesFromTitle("Harry Potter and the Chamber of Secrets_ 2"), null);
});

test("ignores edition/format parentheticals", () => {
  assert.equal(parseSeriesFromTitle("Catch-22_ 50th Anniversary Edition"), null);
  assert.equal(
    parseSeriesFromTitle("Easy Spanish Reader Premium, Third Edition (Spanish Edition)"),
    null,
  );
});

test("does not treat a plain subtitle parenthetical as a series", () => {
  assert.equal(parseSeriesFromTitle("Ready Player Two (Ready Player One)"), null);
});

test("normalizeSeries trims and nulls empty names", () => {
  assert.deepEqual(normalizeSeries("  Mistborn ", "3"), { series: "Mistborn", seriesIndex: 3 });
  assert.deepEqual(normalizeSeries("", "3"), { series: null, seriesIndex: null });
  assert.deepEqual(normalizeSeries("   ", 2), { series: null, seriesIndex: null });
});

test("normalizeSeries clears the index when the series is cleared", () => {
  assert.deepEqual(normalizeSeries(null, 4), { series: null, seriesIndex: null });
});

test("normalizeSeries coerces bad indexes to null but keeps the series", () => {
  assert.deepEqual(normalizeSeries("Cradle", "abc"), { series: "Cradle", seriesIndex: null });
  assert.deepEqual(normalizeSeries("Cradle", ""), { series: "Cradle", seriesIndex: null });
  assert.deepEqual(normalizeSeries("Cradle", 1.5), { series: "Cradle", seriesIndex: 1.5 });
});
