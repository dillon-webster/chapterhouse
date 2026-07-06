import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const page = readFileSync("src/app/(app)/page.tsx", "utf8");
const activityFeed = readFileSync("src/components/ActivityFeed.tsx", "utf8");

test("home page presents a richer dashboard structure", () => {
  assert.match(page, /max-w-5xl/);
  assert.match(page, /This month&apos;s pick/);
  assert.match(page, /Your nightstand/);
  assert.match(page, /shelfCounts/);
  assert.match(page, /Continue/);
});

test("home page treats progressPercent as an already-normalized percentage", () => {
  assert.match(page, /Math\.round\(value\)/);
  assert.doesNotMatch(page, /value \* 100/);
});

test("activity feed renders as a styled timeline list", () => {
  assert.match(activityFeed, /divide-y divide-accent\/10/);
  assert.match(activityFeed, /rounded-full bg-accent\/70/);
});
