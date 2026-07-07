import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { signupSchema } from "@/lib/accountSchema";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Slows invite-code guessing and mass account creation.
const SIGNUP_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 };

export async function POST(request: Request) {
  const rate = checkRateLimit(`signup:${clientIp(request)}`, SIGNUP_LIMIT);
  if (!rate.ok) return rateLimitResponse(rate);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { username, email, displayName, password, inviteCode } = parsed.data;

  // Validate the shared invite code.
  const invite = await prisma.inviteCode.findFirst({
    where: { code: inviteCode, isActive: true },
  });
  if (!invite) {
    return NextResponse.json({ error: "Invalid or inactive invite code" }, { status: 403 });
  }

  const passwordHash = await hashPassword(password);

  try {
    await prisma.user.create({
      data: {
        username,
        email: email.toLowerCase(),
        displayName,
        passwordHash,
      },
    });
  } catch (err) {
    // Unique constraint violation on username or email.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = (err.meta?.target as string[] | undefined)?.join(", ") ?? "field";
      return NextResponse.json(
        { error: `That ${target.includes("email") ? "email" : "username"} is already taken` },
        { status: 409 },
      );
    }
    throw err;
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
