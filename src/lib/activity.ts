import { ActivityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ActivityItem } from "@/lib/activityFormat";

// Fetch the most recent activity events in the serializable shape the feed
// renders. Shared by the dashboard's initial render and the polling API route.
// Pass a userId to scope to a single member's activity (their profile page).
export async function getRecentActivity(
  take = 15,
  userId?: string,
): Promise<ActivityItem[]> {
  const events = await prisma.activityEvent.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { createdAt: "desc" },
    take,
    include: {
      user: { select: { displayName: true, username: true } },
      book: { select: { title: true } },
    },
  });

  return events.map((event) => ({
    id: event.id,
    type: event.type,
    payload: event.payload,
    createdAt: event.createdAt.toISOString(),
    user: event.user,
    book: event.book ? { title: event.book.title } : null,
  }));
}

// Central helper for recording activity-feed events so call sites stay uniform.
// The feed is global (everyone sees everyone) per the v1 product decision.
export async function recordActivity(params: {
  userId: string;
  type: ActivityType;
  bookId?: string | null;
  payload?: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.activityEvent.create({
    data: {
      userId: params.userId,
      type: params.type,
      bookId: params.bookId ?? null,
      payload: params.payload,
    },
  });
}
