import test from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit, clientIp, resetRateLimits } from "@/lib/rateLimit";

const OPTS = { limit: 3, windowMs: 60_000 };

test("allows requests up to the limit, then blocks", () => {
  resetRateLimits();
  const now = 1_000_000;

  assert.equal(checkRateLimit("k", OPTS, now).ok, true);
  assert.equal(checkRateLimit("k", OPTS, now + 1).ok, true);
  assert.equal(checkRateLimit("k", OPTS, now + 2).ok, true);

  const blocked = checkRateLimit("k", OPTS, now + 3);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfterSeconds >= 1);
});

test("window slides: old hits expire and free up capacity", () => {
  resetRateLimits();
  const now = 1_000_000;

  for (let i = 0; i < 3; i++) checkRateLimit("k", OPTS, now + i);
  assert.equal(checkRateLimit("k", OPTS, now + 10).ok, false);

  // First hit falls out of the window.
  assert.equal(checkRateLimit("k", OPTS, now + OPTS.windowMs + 1).ok, true);
});

test("retryAfterSeconds counts down to when the oldest hit expires", () => {
  resetRateLimits();
  const now = 1_000_000;

  for (let i = 0; i < 3; i++) checkRateLimit("k", OPTS, now);
  const blocked = checkRateLimit("k", OPTS, now + 45_000);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.retryAfterSeconds, 15);
});

test("keys are independent", () => {
  resetRateLimits();
  const now = 1_000_000;

  for (let i = 0; i < 3; i++) checkRateLimit("a", OPTS, now);
  assert.equal(checkRateLimit("a", OPTS, now).ok, false);
  assert.equal(checkRateLimit("b", OPTS, now).ok, true);
});

test("blocked requests do not extend the window", () => {
  resetRateLimits();
  const now = 1_000_000;

  for (let i = 0; i < 3; i++) checkRateLimit("k", OPTS, now);
  // Hammering while blocked shouldn't push recovery further out.
  for (let t = 1_000; t < 50_000; t += 1_000) checkRateLimit("k", OPTS, now + t);
  assert.equal(checkRateLimit("k", OPTS, now + OPTS.windowMs + 1).ok, true);
});

test("clientIp prefers the first x-forwarded-for hop", () => {
  const req = new Request("http://x", {
    headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1", "x-real-ip": "10.0.0.1" },
  });
  assert.equal(clientIp(req), "203.0.113.9");

  const real = new Request("http://x", { headers: { "x-real-ip": "203.0.113.7" } });
  assert.equal(clientIp(real), "203.0.113.7");

  assert.equal(clientIp(new Request("http://x")), "unknown");
});
