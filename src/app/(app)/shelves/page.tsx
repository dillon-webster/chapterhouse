import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SHELF_LABELS, SHELF_ACCENTS, SHELF_EMPTY_MESSAGES } from "@/lib/shelf";
import { ShelfBookcase, type ShelfData } from "@/components/ShelfBookcase";

export const dynamic = "force-dynamic";

// Hero first, then the three cabinets, left → right.
const DISPLAY_ORDER = [
  "CURRENTLY_READING",
  "WANT_TO_READ",
  "FINISHED",
  "DNF",
] as const;

export default async function ShelvesPage() {
  const session = await auth();

  const entries = session
    ? await prisma.userBook.findMany({
        where: { userId: session.user.id },
        orderBy: { addedAt: "desc" },
        include: {
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              coverPath: true,
              coverUrl: true,
              spineImageData: true,
              pageCount: true,
            },
          },
        },
      })
    : [];

  const shelves: ShelfData[] = DISPLAY_ORDER.map((status) => ({
    status,
    label: SHELF_LABELS[status],
    accentColor: SHELF_ACCENTS[status],
    emptyMessage: SHELF_EMPTY_MESSAGES[status],
    entries: entries
      .filter((e) => e.status === status)
      .map((e) => ({
        entryId: e.id,
        bookId: e.book.id,
        title: e.book.title,
        author: e.book.author,
        hasCover: !!(e.book.coverPath || e.book.coverUrl),
        spineImageData: e.book.spineImageData,
        progressPercent: e.progressPercent,
        pageCount: e.book.pageCount,
      })),
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <ShelfBookcase shelves={shelves} totalBooks={entries.length} />
    </div>
  );
}
