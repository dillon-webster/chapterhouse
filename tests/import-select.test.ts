import test from "node:test";
import assert from "node:assert/strict";
import { selectNewEpubs } from "@/lib/importBooks";

test("returns every EPUB as new when the catalog is empty", () => {
  const r = selectNewEpubs(["a.epub", "b.epub"], []);
  assert.deepEqual(r, { newFiles: ["a.epub", "b.epub"], skipped: 0 });
});

test("skips EPUBs already tracked by path", () => {
  const r = selectNewEpubs(["a.epub", "b.epub", "c.epub"], ["a.epub", "c.epub"]);
  assert.deepEqual(r, { newFiles: ["b.epub"], skipped: 2 });
});

test("ignores non-EPUB entries entirely", () => {
  const r = selectNewEpubs(["a.epub", "cover.jpg", "notes.txt", ".DS_Store"], []);
  assert.deepEqual(r, { newFiles: ["a.epub"], skipped: 0 });
});

test("matches the .epub extension case-insensitively", () => {
  const r = selectNewEpubs(["Book.EPUB", "other.Epub"], []);
  assert.deepEqual(r, { newFiles: ["Book.EPUB", "other.Epub"], skipped: 0 });
});

test("counts all files as skipped when everything is already imported", () => {
  const r = selectNewEpubs(["a.epub", "b.epub"], ["a.epub", "b.epub"]);
  assert.deepEqual(r, { newFiles: [], skipped: 2 });
});
