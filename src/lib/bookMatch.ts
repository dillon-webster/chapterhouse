import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Normalize a title/author for fuzzy de-duplication across sources (EPUB import
// vs. Open Library add). Lowercase, strip punctuation, collapse whitespace.
export function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Find an existing Book that represents the same work as `title`/`author`,
 * regardless of source — so an EPUB import and an Open Library add converge on
 * one record instead of duplicating. Matches on normalized title + author.
 */
export async function findMatchingBook(
  title: string,
  author: string,
  options: { excludeId?: string; db?: Db } = {},
): Promise<{ id: string } | null> {
  const db = options.db ?? prisma;
  const nTitle = normalizeKey(title);
  const nAuthor = normalizeKey(author);

  // Compare on normalized title+author (punctuation/case/whitespace-insensitive),
  // which can't be expressed in SQL without a stored normalized column — so scan
  // id/title/author (cheap per row) and match in memory. Import/add are
  // infrequent actions, not a hot path.
  const candidates = await db.book.findMany({
    where: options.excludeId ? { id: { not: options.excludeId } } : undefined,
    select: { id: true, title: true, author: true },
  });

  const match = candidates.find(
    (b) => normalizeKey(b.title) === nTitle && normalizeKey(b.author) === nAuthor,
  );
  return match ? { id: match.id } : null;
}
