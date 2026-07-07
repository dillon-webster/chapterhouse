import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeSeries } from "@/lib/series";

// Bulk-assign series grouping across the catalog in one save — powers the admin
// "Manage catalog" screen. Each entry is normalized exactly like the per-book
// PATCH, so the two stay consistent.
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const updates = body?.updates;
  if (!Array.isArray(updates)) {
    return NextResponse.json({ error: "Expected an `updates` array" }, { status: 400 });
  }

  // Keep well-formed rows only; ignore anything without a string id.
  const rows = updates
    .filter((u): u is { id: string } => typeof u?.id === "string")
    .map((u) => ({ id: u.id, ...normalizeSeries((u as any).series, (u as any).seriesIndex) }));

  // updateMany no-ops on a since-deleted id instead of throwing, so one stale
  // row can't fail the whole batch.
  await prisma.$transaction(
    rows.map((r) =>
      prisma.book.updateMany({
        where: { id: r.id },
        data: { series: r.series, seriesIndex: r.seriesIndex },
      }),
    ),
  );

  return NextResponse.json({ ok: true, updated: rows.length });
}
