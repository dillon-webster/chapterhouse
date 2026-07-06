import type { ShelfStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRecentActivity } from "@/lib/activity";
import type { ActivityItem } from "@/lib/activityFormat";
import { normalizeTheme, type ThemeId } from "@/lib/themes";

export type ProfileData = {
  user: {
    id: string;
    username: string;
    displayName: string;
    bio: string | null;
    hasAvatar: boolean;
    theme: ThemeId;
    createdAt: string;
  };
  counts: Record<ShelfStatus, number>;
  currentlyReading: {
    bookId: string;
    title: string;
    author: string;
    hasCover: boolean;
    progressPercent: number;
  }[];
  finishedThisYear: number;
  totalSeconds: number;
  recentActivity: ActivityItem[];
};

// Assemble everything a member's profile page shows, in a serializable shape.
export async function getProfileData(userId: string): Promise<ProfileData | null> {
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);

  const [user, entries, finishedThisYear, sessionsAgg, recentActivity] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          theme: true,
          createdAt: true,
        },
      }),
      prisma.userBook.findMany({
        where: { userId },
        orderBy: { startedAt: "desc" },
        include: {
          book: { select: { id: true, title: true, author: true, coverPath: true, coverUrl: true } },
        },
      }),
      prisma.userBook.count({
        where: { userId, status: "FINISHED", finishedAt: { gte: startOfYear } },
      }),
      prisma.readingSession.aggregate({
        where: { userId },
        _sum: { durationSeconds: true },
      }),
      getRecentActivity(10, userId),
    ]);

  if (!user) return null;

  const counts: Record<ShelfStatus, number> = {
    WANT_TO_READ: 0,
    CURRENTLY_READING: 0,
    FINISHED: 0,
    DNF: 0,
  };
  const currentlyReading: ProfileData["currentlyReading"] = [];
  for (const e of entries) {
    counts[e.status] += 1;
    if (e.status === "CURRENTLY_READING") {
      currentlyReading.push({
        bookId: e.book.id,
        title: e.book.title,
        author: e.book.author,
        hasCover: !!(e.book.coverPath || e.book.coverUrl),
        progressPercent: e.progressPercent,
      });
    }
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      hasAvatar: !!user.avatarUrl,
      theme: normalizeTheme(user.theme),
      createdAt: user.createdAt.toISOString(),
    },
    counts,
    currentlyReading,
    finishedThisYear,
    totalSeconds: sessionsAgg._sum.durationSeconds ?? 0,
    recentActivity,
  };
}

// Compact human label for accumulated reading time.
export function formatReadingTime(totalSeconds: number): string {
  if (totalSeconds < 60) return "0m";
  if (totalSeconds < 3600) return `${Math.round(totalSeconds / 60)}m`;
  const hours = totalSeconds / 3600;
  return `${hours.toFixed(hours < 10 ? 1 : 0)}h`;
}
