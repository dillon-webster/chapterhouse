import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return new NextResponse(null, { status: 401 });

  const { id } = await params;
  const book = await prisma.book.findUnique({ where: { id }, select: { epubPath: true } });
  if (!book?.epubPath) return new NextResponse(null, { status: 404 });

  const buffer = await readStoredFile("epubs", book.epubPath);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/epub+zip",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
