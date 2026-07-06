import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import Link from "next/link";
import { ImportBooksButton } from "@/components/ImportBooksButton";
import { CatalogGrid, type CatalogItem, type BookTile } from "@/components/CatalogGrid";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const [session, books] = await Promise.all([
    auth(),
    // Catalog = the club's readable library (uploaded EPUBs). Open Library
    // books are shelf-only and don't appear here.
    prisma.book.findMany({ where: { source: "EPUB" }, orderBy: { addedAt: "desc" } }),
  ]);

  // Group books that share a `series` (≥2 members) into a single stack; every
  // other book stays standalone. Books arrive newest-first, so a series group
  // lands at the position of its most-recently-added volume.
  const tile = (b: (typeof books)[number]): BookTile => ({
    id: b.id,
    title: b.title,
    author: b.author,
    hasCover: b.coverPath != null,
    isCurrentPick: b.isCurrentPick,
  });

  const seriesCounts = new Map<string, number>();
  for (const b of books) {
    if (b.series) seriesCounts.set(b.series, (seriesCounts.get(b.series) ?? 0) + 1);
  }
  const isGrouped = (s: string | null): s is string =>
    s != null && (seriesCounts.get(s) ?? 0) >= 2;

  const items: CatalogItem[] = [];
  const emitted = new Set<string>();
  for (const b of books) {
    if (isGrouped(b.series)) {
      if (emitted.has(b.series)) continue;
      emitted.add(b.series);
      const volumes = books
        .filter((x) => x.series === b.series)
        .sort(
          (a, z) =>
            (a.seriesIndex ?? Infinity) - (z.seriesIndex ?? Infinity) ||
            a.title.localeCompare(z.title),
        );
      items.push({
        type: "series",
        name: b.series,
        author: volumes[0].author,
        books: volumes.map(tile),
      });
    } else {
      items.push({ type: "book", book: tile(b) });
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-accent-dark">Catalog</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/shelves/add"
            className="rounded-lg bg-accent-dark px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-accent"
          >
            + Add book
          </Link>
          {session?.user?.isAdmin && <ImportBooksButton />}
        </div>
      </div>

      {books.length === 0 ? (
        <p className="rounded-lg border border-dashed border-accent/30 p-10 text-center text-sm text-ink/50">
          No books yet.{" "}
          {session?.user?.isAdmin ? "Upload the first one!" : "Check back soon."}
        </p>
      ) : (
        <CatalogGrid items={items} />
      )}
    </div>
  );
}
