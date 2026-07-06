import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";
import path from "node:path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return new NextResponse(null, { status: 401 });

  const { id } = await params;
  const book = await prisma.book.findUnique({
    where: { id },
    select: { coverPath: true, coverUrl: true },
  });
  if (!book) return new NextResponse(null, { status: 404 });

  // Open Library books carry an external cover — redirect to it.
  if (!book.coverPath && book.coverUrl) {
    return NextResponse.redirect(book.coverUrl);
  }
  if (!book.coverPath) return new NextResponse(null, { status: 404 });

  const buffer = await readStoredFile("covers", book.coverPath);
  const ext = path.extname(book.coverPath).toLowerCase();
  const contentType =
    ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
