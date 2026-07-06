import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BookAdminActions } from "@/components/BookAdminActions";
import { ShelfControls } from "@/components/ShelfControls";
import { BackButton } from "@/components/BackButton";

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const book = await prisma.book.findUnique({ where: { id } });

  if (!book) notFound();

  const shelfEntry = session
    ? await prisma.userBook.findUnique({
        where: { userId_bookId: { userId: session.user.id, bookId: book.id } },
        select: { status: true },
      })
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <BackButton />
      <div className="flex gap-5">
        <div className="w-32 shrink-0 sm:w-40">
          <div className="aspect-[2/3] overflow-hidden rounded-lg border border-accent/10 bg-accent/5">
            {book.coverPath || book.coverUrl ? (
              <img
                src={`/api/books/${book.id}/cover`}
                alt={book.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-3 text-center text-xs text-ink/40">
                {book.title}
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {book.isCurrentPick && (
            <span className="mb-2 inline-block rounded bg-accent/15 px-1.5 py-0.5 text-xs font-semibold text-accent-dark">
              Current pick
            </span>
          )}
          <h1 className="text-xl font-bold leading-snug sm:text-2xl">{book.title}</h1>
          <p className="mt-1 text-ink/60">{book.author}</p>
          {book.series && (
            <p className="mt-1 text-sm text-ink/50">
              {book.series}
              {book.seriesIndex != null && ` · Book ${book.seriesIndex}`}
            </p>
          )}
          {book.description && (
            <p className="mt-4 text-sm leading-relaxed text-ink/80">{book.description}</p>
          )}
          {book.epubPath ? (
            <Link
              href={`/books/${book.id}/read`}
              className="mt-5 inline-block rounded-lg bg-accent-dark px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-accent"
            >
              Read
            </Link>
          ) : (
            <p className="mt-5 text-xs italic text-ink/40">
              Tracked from Open Library — no in-app reader for this book.
            </p>
          )}

          <ShelfControls bookId={book.id} status={shelfEntry?.status ?? null} />
        </div>
      </div>

      {session?.user?.isAdmin && (
        <BookAdminActions
          bookId={book.id}
          isCurrentPick={book.isCurrentPick}
          series={book.series}
          seriesIndex={book.seriesIndex}
        />
      )}
    </div>
  );
}
