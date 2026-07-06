import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { generateSpine } from "@/lib/spine";
import { findMatchingBook } from "@/lib/bookMatch";
import { fetchOpenLibraryDescription } from "@/lib/openLibrary";
import { SHELF_STATUSES } from "@/lib/shelf";

const schema = z.object({
  openLibraryId: z.string().min(1),
  title: z.string().min(1),
  author: z.string().nullish(),
  coverUrl: z.string().url().nullish(),
  pageCount: z.number().int().positive().nullish(),
  status: z.enum(SHELF_STATUSES).default("WANT_TO_READ"),
});

// Add an Open Library book to the current user's shelf. The Book row is shared
// and deduped by openLibraryId, so multiple users tracking the same title reuse
// one record. These books are metadata-only (no EPUB / reader).
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return new NextResponse(null, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { openLibraryId, title, author, coverUrl, pageCount, status } = parsed.data;
  const authorName = author ?? "Unknown Author";

  // Reuse an existing record if we already have this work — first by Open
  // Library id, then by a fuzzy title+author match against any source (so an
  // EPUB already in the catalog absorbs this add instead of duplicating).
  const existingById = await prisma.book.findUnique({ where: { openLibraryId } });
  const match = existingById ?? (await findMatchingBook(title, authorName));

  let book;
  if (match) {
    // Backfill any fields the existing record is missing; never clobber an
    // EPUB's local cover or its synopsis.
    book = await prisma.book.update({
      where: { id: match.id },
      data: {
        openLibraryId,
        coverUrl: coverUrl ?? undefined,
        pageCount: pageCount ?? undefined,
      },
    });
  } else {
    const description = await fetchOpenLibraryDescription(openLibraryId);
    book = await prisma.book.create({
      data: {
        openLibraryId,
        source: "OPEN_LIBRARY",
        title,
        author: authorName,
        description,
        coverUrl: coverUrl ?? null,
        pageCount: pageCount ?? null,
      },
    });
  }

  const existing = await prisma.userBook.findUnique({
    where: { userId_bookId: { userId: session.user.id, bookId: book.id } },
    select: { status: true },
  });

  if (existing?.status !== status) {
    const now = new Date();
    await prisma.userBook.upsert({
      where: { userId_bookId: { userId: session.user.id, bookId: book.id } },
      create: {
        userId: session.user.id,
        bookId: book.id,
        status,
        startedAt: status === "CURRENTLY_READING" ? now : null,
        finishedAt: status === "FINISHED" ? now : null,
        progressPercent: status === "FINISHED" ? 100 : 0,
      },
      update: { status },
    });

    await recordActivity({
      userId: session.user.id,
      type: "SHELF_CHANGE",
      bookId: book.id,
      payload: { from: existing?.status ?? null, to: status },
    });
  }

  // Best-effort spine generation (skips if it already has one).
  await generateSpine(book.id).catch(() => {});

  return NextResponse.json({ bookId: book.id }, { status: 201 });
}
