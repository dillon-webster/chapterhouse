import test from "node:test";
import assert from "node:assert/strict";
import { shelfTransition } from "@/lib/shelf";

const NOW = new Date("2026-07-07T12:00:00.000Z");

test("starting a book stamps startedAt and leaves it unfinished", () => {
  const t = shelfTransition({ status: "CURRENTLY_READING", existingStartedAt: null, now: NOW });
  assert.deepEqual(t, { startedAt: NOW, finishedAt: null });
});

test("startedAt is preserved once set, not overwritten on later reads", () => {
  const earlier = new Date("2026-01-01T00:00:00.000Z");
  const t = shelfTransition({ status: "CURRENTLY_READING", existingStartedAt: earlier, now: NOW });
  assert.equal(t.startedAt, earlier);
  assert.equal(t.finishedAt, null);
});

test("finishing stamps finishedAt and pins progress to 100", () => {
  const started = new Date("2026-06-01T00:00:00.000Z");
  const t = shelfTransition({ status: "FINISHED", existingStartedAt: started, now: NOW });
  assert.deepEqual(t, { startedAt: started, finishedAt: NOW, progressPercent: 100 });
});

test("want-to-read carries no dates and does not touch progress", () => {
  const t = shelfTransition({ status: "WANT_TO_READ", existingStartedAt: null, now: NOW });
  assert.deepEqual(t, { startedAt: null, finishedAt: null });
  assert.equal("progressPercent" in t, false);
});

test("DNF clears finishedAt but keeps an existing startedAt", () => {
  const started = new Date("2026-06-01T00:00:00.000Z");
  const t = shelfTransition({ status: "DNF", existingStartedAt: started, now: NOW });
  assert.deepEqual(t, { startedAt: started, finishedAt: null });
});

test("re-shelving a finished book as want-to-read leaves progress untouched", () => {
  // progressPercent absent means the upsert won't force it back to 0.
  const t = shelfTransition({ status: "WANT_TO_READ", existingStartedAt: NOW, now: NOW });
  assert.equal("progressPercent" in t, false);
});
