import test from "node:test";
import assert from "node:assert/strict";
import { buildProgressUpdate } from "@/lib/progress";

test("progress saves keep finished books finished at 100 percent", () => {
  const update = buildProgressUpdate({
    existingStatus: "FINISHED",
    cfi: "epubcfi(/6/2)",
    newPercent: 42,
  });

  assert.deepEqual(update, {
    currentLocation: "epubcfi(/6/2)",
    progressPercent: 100,
    status: "FINISHED",
  });
});

test("progress saves move unfinished books into currently reading", () => {
  const update = buildProgressUpdate({
    existingStatus: "WANT_TO_READ",
    cfi: "epubcfi(/6/4)",
    newPercent: 12,
  });

  assert.deepEqual(update, {
    currentLocation: "epubcfi(/6/4)",
    progressPercent: 12,
    status: "CURRENTLY_READING",
  });
});
