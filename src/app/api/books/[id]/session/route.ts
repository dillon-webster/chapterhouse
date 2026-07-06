import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Each POST records a chunk of focused reading time as a ReadingSession row.
// The reader flushes accumulated active seconds periodically (and on
// hide/unmount via sendBeacon), so totals are just the sum of these rows.
const schema = z.object({ seconds: z.number().int().min(1).max(3600) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return new NextResponse(null, { status: 401 });

  const { id: bookId } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Guard against a stale beacon for a since-deleted book (FK would throw).
  const book = await prisma.book.findUnique({ where: { id: bookId }, select: { id: true } });
  if (!book) return new NextResponse(null, { status: 404 });

  await prisma.readingSession.create({
    data: {
      userId: session.user.id,
      bookId,
      durationSeconds: parsed.data.seconds,
      endedAt: new Date(),
    },
  });

  return new NextResponse(null, { status: 204 });
}
