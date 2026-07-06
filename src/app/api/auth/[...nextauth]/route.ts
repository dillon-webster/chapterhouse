import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/auth";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

export const { GET } = handlers;

// Throttle credential sign-in attempts per IP; other NextAuth POSTs
// (signout, CSRF) pass through untouched.
const LOGIN_LIMIT = { limit: 5, windowMs: 60 * 1000 };

export async function POST(request: NextRequest) {
  if (new URL(request.url).pathname.endsWith("/callback/credentials")) {
    const result = checkRateLimit(`login:${clientIp(request)}`, LOGIN_LIMIT);
    if (!result.ok) {
      // next-auth's client parses `url` out of every callback response (it
      // does `new URL(data.url)` unconditionally), so the 429 body must keep
      // that shape rather than the plain { error } JSON used elsewhere.
      const url = new URL("/login?error=RateLimited", request.url);
      return NextResponse.json(
        { url: url.toString() },
        { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
      );
    }
  }
  return handlers.POST(request);
}
