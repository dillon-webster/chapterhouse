import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { searchOpenLibrary } from "@/lib/openLibrary";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return new NextResponse(null, { status: 401 });

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
