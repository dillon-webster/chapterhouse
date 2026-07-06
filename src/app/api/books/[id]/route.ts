import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";

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

  const data: { series?: string | null; seriesIndex?: number | null } = {};
  if ("series" in body) {
    const s = typeof body.series === "string" ? body.series.trim() : "";
    data.series = s.length > 0 ? s : null;
  }
  if ("seriesIndex" in body) {
    const n = Number(body.seriesIndex);
    data.seriesIndex = Number.isFinite(n) ? n : null;
  }
  // Clearing the series also clears its index so books don't keep a stale order.
  if (data.series === null) data.seriesIndex = null;

  const book = await prisma.book.update({ where: { id }, data });
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
