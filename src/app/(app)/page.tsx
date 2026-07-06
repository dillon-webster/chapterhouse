import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRecentActivity } from "@/lib/activity";
import { ActivityFeed } from "@/components/ActivityFeed";
import Link from "next/link";

export const dynamic = "force-dynamic";

function pct(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default async function DashboardPage() {
  const session = await auth();

  const [currentPick, recentActivity, shelfEntries] = await Promise.all([
    prisma.book.findFirst({
      where: { isCurrentPick: true },
      orderBy: { pickedAt: "desc" },
    }),
    getRecentActivity(15),
    session
      ? prisma.userBook.findMany({
          where: { userId: session.user.id },
          orderBy: [{ startedAt: "desc" }, { addedAt: "desc" }],
          include: {
            book: {
              select: {
                id: true,
                title: true,
                author: true,
                coverPath: true,
                coverUrl: true,
                epubPath: true,
              },
            },
          },
        })
      : [],
  ]);

  const readingNow =
    shelfEntries.find((entry) => entry.status === "CURRENTLY_READING") ?? null;
  const shelfCounts = {
    active: shelfEntries.filter((entry) => entry.status === "CURRENTLY_READING").length,
    queued: shelfEntries.filter((entry) => entry.status === "WANT_TO_READ").length,
    finished: shelfEntries.filter((entry) => entry.status === "FINISHED").length,
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <section className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold leading-tight text-ink sm:text-3xl">
            Welcome back, {session?.user?.name ?? "reader"}.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-ink/55">
            Pick up where you left off, check the club pick, and see what everyone
            has been reading.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/shelves"
            className="rounded-lg border border-accent/25 px-4 py-2 text-sm font-semibold text-accent-dark transition-colors hover:border-accent/50 hover:bg-accent/10"
          >
            Shelves
          </Link>
          <Link
            href="/catalog"
            className="rounded-lg bg-accent-dark px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-accent"
          >
            Catalog
          </Link>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.8fr)]">
        <section className="overflow-hidden rounded-lg border border-accent/15 bg-surface/45">
          <div className="grid gap-0 sm:grid-cols-[150px_1fr]">
            <div className="flex min-h-48 items-center justify-center border-b border-accent/10 bg-accent/10 p-5 sm:border-b-0 sm:border-r">
              {currentPick && (currentPick.coverPath || currentPick.coverUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/books/${currentPick.id}/cover`}
                  alt=""
                  className="h-40 w-28 rounded-md object-cover shadow-lg shadow-ink/10"
                />
              ) : (
                <div className="flex h-40 w-28 items-center justify-center rounded-md border border-accent/20 bg-paper/70 p-3 text-center text-sm font-semibold text-accent-dark">
                  Chapterhouse
                </div>
              )}
            </div>
            <div className="flex min-h-48 flex-col justify-between p-5 sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink/45">
                  This month&apos;s pick
                </p>
                {currentPick ? (
                  <>
                    <h2 className="mt-3 text-2xl font-bold leading-tight text-ink">
                      {currentPick.title}
                    </h2>
                    <p className="mt-1 text-base text-ink/65">{currentPick.author}</p>
                    {currentPick.description && (
                      <p className="mt-4 max-h-24 overflow-hidden text-sm leading-6 text-ink/60">
                        {currentPick.description}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-ink/55">
                    No pick selected yet. An admin can flag a book as the current
                    pick.
                  </p>
                )}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {currentPick && (
                  <Link
                    href={`/books/${currentPick.id}`}
                    className="rounded-lg bg-accent-dark px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-accent"
                  >
                    View pick
                  </Link>
                )}
                <Link
                  href="/members"
                  className="rounded-lg border border-accent/25 px-4 py-2 text-sm font-semibold text-accent-dark transition-colors hover:border-accent/50 hover:bg-accent/10"
                >
                  Members
                </Link>
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-lg border border-accent/15 bg-surface/35 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">
            Your nightstand
          </p>
          {readingNow ? (
            <div className="mt-4">
              <p className="text-lg font-bold leading-snug">{readingNow.book.title}</p>
              <p className="text-sm text-ink/60">{readingNow.book.author}</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-accent/12">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-300"
                  style={{ width: `${pct(readingNow.progressPercent)}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-semibold text-ink/45">
                {pct(readingNow.progressPercent)}% complete
              </p>
              <Link
                href={
                  readingNow.book.epubPath
                    ? `/books/${readingNow.book.id}/read`
                    : `/books/${readingNow.book.id}`
                }
                className="mt-5 inline-flex rounded-lg bg-accent-dark px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-accent"
              >
                Continue
              </Link>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-ink/55">
              Nothing open right now.
            </p>
          )}

          <dl className="mt-6 grid grid-cols-3 gap-2 border-t border-accent/10 pt-4">
            <div>
              <dt className="text-[11px] font-semibold text-ink/40">Reading</dt>
              <dd className="mt-1 text-xl font-bold">{shelfCounts.active}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold text-ink/40">Queued</dt>
              <dd className="mt-1 text-xl font-bold">{shelfCounts.queued}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold text-ink/40">Finished</dt>
              <dd className="mt-1 text-xl font-bold">{shelfCounts.finished}</dd>
            </div>
          </dl>
        </aside>
      </div>

      <section className="mt-4 rounded-lg border border-accent/15 bg-surface/30 p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-ink/45">
            Recent activity
          </h2>
          <Link
            href="/members"
            className="text-sm font-semibold text-accent-dark transition-colors hover:text-accent"
          >
            Members
          </Link>
        </div>
        <ActivityFeed initial={recentActivity} />
      </section>
    </div>
  );
}
