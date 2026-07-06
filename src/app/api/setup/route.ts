import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";

const SETUP_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 };

// First-run setup: creates the instance's admin account and initial invite
// code. Only usable while the instance has zero users; afterwards it is inert
// (both GET and POST), so it needs no auth of its own.

const setupSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers, and underscores only"),
  email: z.email("Enter a valid email"),
  displayName: z.string().min(1, "Display name is required").max(50),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

// Readable invite code, unambiguous charset (no 0/O/1/I/L).
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const group = () =>
    Array.from({ length: 4 }, () => chars[randomInt(chars.length)]).join("");
  return `${group()}-${group()}`;
}

export async function GET() {
  const users = await prisma.user.count();
  return NextResponse.json({ needsSetup: users === 0 });
}

export async function POST(request: Request) {
  const rate = checkRateLimit(`setup:${clientIp(request)}`, SETUP_LIMIT);
  if (!rate.ok) return rateLimitResponse(rate);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = setupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { username, email, displayName, password } = parsed.data;
  const passwordHash = await hashPassword(password);
  const inviteCode = generateInviteCode();

  try {
    await prisma.$transaction(async (tx) => {
      const users = await tx.user.count();
      if (users > 0) throw new Error("ALREADY_SET_UP");
      await tx.user.create({
        data: {
          username,
          email: email.toLowerCase(),
          displayName,
          passwordHash,
          isAdmin: true,
        },
      });
      await tx.inviteCode.create({ data: { code: inviteCode, isActive: true } });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY_SET_UP") {
      return NextResponse.json(
        { error: "This instance is already set up" },
        { status: 409 },
      );
    }
    throw err;
  }

  return NextResponse.json({ ok: true, inviteCode }, { status: 201 });
}
