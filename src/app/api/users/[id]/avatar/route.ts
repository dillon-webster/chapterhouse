import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";
import path from "node:path";

// Serves a user's uploaded avatar. The src URL is stable (/api/users/<id>/avatar)
// while the stored filename changes on each upload, so we must not cache hard.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return new NextResponse(null, { status: 401 });

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { avatarUrl: true },
  });
  if (!user?.avatarUrl) return new NextResponse(null, { status: 404 });

  const buffer = await readStoredFile("avatars", user.avatarUrl);
  const ext = path.extname(user.avatarUrl).toLowerCase();
  const contentType =
    ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, no-cache",
    },
  });
}
