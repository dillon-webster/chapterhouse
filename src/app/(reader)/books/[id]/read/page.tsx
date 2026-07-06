import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ReaderView } from "@/components/ReaderView";

export default async function ReaderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const [book, userBook] = await Promise.all([
    prisma.book.findUnique({ where: { id }, select: { id: true, title: true } }),
    session
      ? prisma.userBook.findUnique({
          where: { userId_bookId: { userId: session.user.id, bookId: id } },
          select: { currentLocation: true },
        })
      : null,
  ]);

  if (!book) notFound();

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-accent/10 bg-paper/95 px-4 py-2 backdrop-blur-sm">
        <Link
          href={`/books/${book.id}`}
          className="text-sm text-ink/50 transition-colors hover:text-ink"
        >
          ←
        </Link>
        <span className="truncate text-sm font-medium text-ink/70">{book.title}</span>
      </header>
      <div className="min-h-0 flex-1">
        <ReaderView bookId={book.id} initialCfi={userBook?.currentLocation ?? null} />
      </div>
    </div>
  );
}
