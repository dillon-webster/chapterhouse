import test from "node:test";
import assert from "node:assert/strict";
import { checkEpubUpload, MAX_EPUB_BYTES } from "@/lib/upload";

test("accepts a normal .epub file", () => {
  assert.deepEqual(checkEpubUpload("Dune.epub", 2_000_000), { ok: true });
});

test("accepts the extension case-insensitively", () => {
  assert.equal(checkEpubUpload("Book.EPUB", 1234).ok, true);
  assert.equal(checkEpubUpload("Book.Epub", 1234).ok, true);
});

test("rejects non-epub extensions", () => {
  for (const name of ["cover.jpg", "notes.txt", "book.pdf", "book.epub.zip", "epub"]) {
    const r = checkEpubUpload(name, 1000);
    assert.equal(r.ok, false, name);
  }
});

test("rejects empty files", () => {
  const r = checkEpubUpload("empty.epub", 0);
  assert.equal(r.ok, false);
});

test("rejects files over the size ceiling", () => {
  const r = checkEpubUpload("huge.epub", MAX_EPUB_BYTES + 1);
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.reason, /larger than/);
});

test("accepts a file exactly at the ceiling", () => {
  assert.equal(checkEpubUpload("edge.epub", MAX_EPUB_BYTES).ok, true);
});

test("honors a custom max", () => {
  assert.equal(checkEpubUpload("a.epub", 2000, 1000).ok, false);
  assert.equal(checkEpubUpload("a.epub", 500, 1000).ok, true);
});
