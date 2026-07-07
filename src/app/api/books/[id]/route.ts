import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";
import { normalizeSeries } from "@/lib/series";

// Admin-only metadata edit. Currently used to assign series grouping
// (`series` + `seriesIndex`), since EPUBs carry no series metadata.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  // Require `series` so a partial/empty body can't silently wipe the grouping.
  if (!("series" in body)) {
    return NextResponse.json({ error: "series is required" }, { status: 400 });
  }
  const { series, seriesIndex } = normalizeSeries(body.series, body.seriesIndex);
  const book = await prisma.book.update({
    where: { id },
    data: { series, seriesIndex },
  });
  return NextResponse.json(book);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.book.delete({ where: { id } });
  if (book.epubPath) await deleteFile("epubs", book.epubPath);
  if (book.coverPath) await deleteFile("covers", book.coverPath);

  return new NextResponse(null, { status: 204 });
}
