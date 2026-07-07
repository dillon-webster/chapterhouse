import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { accountSchema } from "@/lib/accountSchema";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";

const SETUP_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 };

// First-run setup: creates the instance's admin account and initial invite
// code. Only usable while the instance has zero users; afterwards it is inert
// (both GET and POST), so it needs no auth of its own.

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

  const parsed = accountSchema.safeParse(body);
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
