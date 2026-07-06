import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { buildProgressUpdate } from "@/lib/progress";
import { z } from "zod";

const HALFWAY = 50;

const schema = z.object({
  cfi: z.string(),
  progress: z.number().min(0).max(1),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return new NextResponse(null, { status: 401 });

  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { cfi, progress } = parsed.data;
  const newPercent = progress * 100;

  // Read the prior state first so we can detect milestone crossings. This route
  // is called repeatedly (debounced) as the user reads, so milestones are guarded
  // on actually crossing a threshold to avoid spamming the feed.
  const existing = await prisma.userBook.findUnique({
    where: { userId_bookId: { userId: session.user.id, bookId: id } },
  });
  const prevPercent = existing?.progressPercent ?? 0;
  // Treat FINISHED as already-read so reopening a finished book doesn't re-fire.
  const wasReading =
    existing?.status === "CURRENTLY_READING" || existing?.status === "FINISHED";
  const isFinished = existing?.status === "FINISHED";

  await prisma.userBook.upsert({
    where: { userId_bookId: { userId: session.user.id, bookId: id } },
    create: {
      userId: session.user.id,
      bookId: id,
      status: "CURRENTLY_READING",
      currentLocation: cfi,
      progressPercent: newPercent,
      startedAt: new Date(),
    },
    update: buildProgressUpdate({
      existingStatus: existing?.status,
      cfi,
      newPercent,
    }),
  });

  // "Started" — first time this book moves into a reading state via the reader.
  // (Manual shelving already emits its own SHELF_CHANGE, and goes through a
  // different route, so this won't double up.)
  if (!wasReading) {
    await recordActivity({
      userId: session.user.id,
      type: "MILESTONE",
      bookId: id,
      payload: { kind: "started" },
    });
  } else if (!isFinished && prevPercent < HALFWAY && newPercent >= HALFWAY) {
    await recordActivity({
      userId: session.user.id,
      type: "MILESTONE",
      bookId: id,
      payload: { kind: "halfway" },
    });
  }

  return new NextResponse(null, { status: 204 });
}
