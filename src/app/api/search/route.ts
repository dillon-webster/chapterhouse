import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { searchOpenLibrary } from "@/lib/openLibrary";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

// Per-user cap on outbound Open Library requests. Searches are
// submit-triggered, so 30/min leaves normal use untouched.
const SEARCH_LIMIT = { limit: 30, windowMs: 60 * 1000 };

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return new NextResponse(null, { status: 401 });

  const rate = checkRateLimit(`search:${session.user.id}`, SEARCH_LIMIT);
  if (!rate.ok) return rateLimitResponse(rate);

  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query) return NextResponse.json({ results: [] });

  try {
    const results = await searchOpenLibrary(query);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Book search is unavailable right now.", results: [] },
      { status: 502 },
    );
  }
}
