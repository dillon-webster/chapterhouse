import test from "node:test";
import assert from "node:assert/strict";
import { formatVersion } from "@/lib/version";

test("formatVersion prefixes semantic versions with v", () => {
  assert.equal(formatVersion("1.0.0"), "v1.0.0");
});
