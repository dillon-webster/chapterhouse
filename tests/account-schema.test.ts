import test from "node:test";
import assert from "node:assert/strict";
import { accountSchema, signupSchema } from "@/lib/accountSchema";

const valid = {
  username: "reader_1",
  email: "Reader@Example.com",
  displayName: "A Reader",
  password: "supersecret",
};

test("accepts a well-formed account", () => {
  assert.equal(accountSchema.safeParse(valid).success, true);
});

test("rejects usernames shorter than 3 characters", () => {
  const r = accountSchema.safeParse({ ...valid, username: "ab" });
  assert.equal(r.success, false);
});

test("rejects usernames with disallowed characters", () => {
  for (const username of ["has space", "dot.name", "emoji😀", "semi;colon"]) {
    assert.equal(accountSchema.safeParse({ ...valid, username }).success, false, username);
  }
});

test("rejects usernames longer than 30 characters", () => {
  const r = accountSchema.safeParse({ ...valid, username: "a".repeat(31) });
  assert.equal(r.success, false);
});

test("rejects passwords shorter than 8 characters", () => {
  const r = accountSchema.safeParse({ ...valid, password: "short12" });
  assert.equal(r.success, false);
});

test("rejects passwords longer than 200 characters", () => {
  const r = accountSchema.safeParse({ ...valid, password: "a".repeat(201) });
  assert.equal(r.success, false);
});

test("rejects malformed email addresses", () => {
  const r = accountSchema.safeParse({ ...valid, email: "not-an-email" });
  assert.equal(r.success, false);
});

test("rejects an empty display name", () => {
  const r = accountSchema.safeParse({ ...valid, displayName: "" });
  assert.equal(r.success, false);
});

test("signup additionally requires a non-empty invite code", () => {
  assert.equal(signupSchema.safeParse(valid).success, false);
  assert.equal(signupSchema.safeParse({ ...valid, inviteCode: "" }).success, false);
  assert.equal(signupSchema.safeParse({ ...valid, inviteCode: "ABCD-2345" }).success, true);
});
