import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
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

  await prisma.$transaction([
    prisma.book.updateMany({
      where: { isCurrentPick: true },
      data: { isCurrentPick: false, pickedAt: null },
    }),
    prisma.book.update({
      where: { id },
      data: { isCurrentPick: true, pickedAt: new Date() },
    }),
  ]);

  return new NextResponse(null, { status: 204 });
}
