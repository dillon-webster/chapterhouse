import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Search the club's readable EPUB library for the "Add book" flow. With no
// query, returns recent books so users can browse.
export async function GET(request: Request) {
  const session = await auth();
  if (!session) return new NextResponse(null, { status: 401 });

  const query = new URL(request.url).searchParams.get("q")?.trim();

  const books = await prisma.book.findMany({
    where: {
      source: "EPUB",
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { author: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: query ? { title: "asc" } : { addedAt: "desc" },
    take: 24,
    select: { id: true, title: true, author: true, coverPath: true, coverUrl: true, pageCount: true },
  });

  const results = books.map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author,
    hasCover: !!(b.coverPath || b.coverUrl),
    pageCount: b.pageCount,
  }));

  return NextResponse.json({ results });
}
