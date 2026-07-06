import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { SHELF_STATUSES } from "@/lib/shelf";

const schema = z.object({
  status: z.enum(SHELF_STATUSES),
});

// PATCH — add the book to the user's shelf or move it to a new status.
// Manages startedAt/finishedAt side effects and emits a SHELF_CHANGE event.
export async function PATCH(
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
  const { status } = parsed.data;

  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.userBook.findUnique({
    where: { userId_bookId: { userId: session.user.id, bookId } },
  });

  // No-op if the status is unchanged — don't spam the activity feed.
  if (existing?.status === status) {
    return new NextResponse(null, { status: 204 });
  }

  const now = new Date();
  const startedAt =
    status === "CURRENTLY_READING" && !existing?.startedAt
      ? now
      : existing?.startedAt ?? null;
  const finishedAt = status === "FINISHED" ? now : null;

  await prisma.userBook.upsert({
    where: { userId_bookId: { userId: session.user.id, bookId } },
    create: {
      userId: session.user.id,
      bookId,
      status,
      startedAt,
      finishedAt,
      progressPercent: status === "FINISHED" ? 100 : 0,
    },
    update: {
      status,
      startedAt,
      finishedAt,
      ...(status === "FINISHED" ? { progressPercent: 100 } : {}),
    },
  });

  await recordActivity({
    userId: session.user.id,
    type: "SHELF_CHANGE",
    bookId,
    payload: { from: existing?.status ?? null, to: status },
  });

  return new NextResponse(null, { status: 204 });
}

// DELETE — remove the book from the user's shelf entirely.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return new NextResponse(null, { status: 401 });

  const { id: bookId } = await params;

  await prisma.userBook.deleteMany({
    where: { userId: session.user.id, bookId },
  });

  return new NextResponse(null, { status: 204 });
}
