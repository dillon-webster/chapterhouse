import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveFile, deleteFile } from "@/lib/storage";
import { parseTheme } from "@/lib/themes";

const MAX_AVATAR_BYTES = 5_000_000;

// Update the signed-in user's own profile: display name, bio, and/or avatar.
// Multipart so the avatar file can ride along with the text fields.
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session) return new NextResponse(null, { status: 401 });

  const form = await request.formData();
  const data: {
    displayName?: string;
    bio?: string | null;
    avatarUrl?: string;
    theme?: string;
  } = {};

  const theme = form.get("theme");
  if (theme !== null) {
    const parsed = parseTheme(theme);
    if (!parsed) {
      return NextResponse.json({ error: "Unknown theme." }, { status: 400 });
    }
    data.theme = parsed;
  }

  const displayName = form.get("displayName");
  if (typeof displayName === "string") {
    const trimmed = displayName.trim();
    if (trimmed.length < 1 || trimmed.length > 60) {
      return NextResponse.json({ error: "Display name must be 1–60 characters." }, { status: 400 });
    }
    data.displayName = trimmed;
  }

  const bio = form.get("bio");
  if (typeof bio === "string") {
    data.bio = bio.trim().slice(0, 500) || null;
  }

  const avatar = form.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    if (!avatar.type.startsWith("image/")) {
      return NextResponse.json({ error: "Avatar must be an image." }, { status: 400 });
    }
    if (avatar.size > MAX_AVATAR_BYTES) {
      return NextResponse.json({ error: "Avatar must be under 5MB." }, { status: 413 });
    }
    const buffer = Buffer.from(await avatar.arrayBuffer());
    const stored = await saveFile("avatars", buffer, avatar.name || "avatar.jpg");

    const current = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    });
    data.avatarUrl = stored;
    if (current?.avatarUrl) await deleteFile("avatars", current.avatarUrl);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  await prisma.user.update({ where: { id: session.user.id }, data });
  return new NextResponse(null, { status: 204 });
}
