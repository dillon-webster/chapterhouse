import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { SHELF_LABELS } from "@/lib/shelf";
import { formatActivity } from "@/lib/activityFormat";
import { formatReadingTime, type ProfileData } from "@/lib/profile";

const SHELF_ORDER = ["CURRENTLY_READING", "FINISHED", "WANT_TO_READ", "DNF"] as const;

export function ProfileView({ data }: { data: ProfileData }) {
  const { user, counts, currentlyReading, finishedThisYear, totalSeconds, recentActivity } = data;
  const memberSince = new Date(user.createdAt).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-center gap-4">
        <Avatar userId={user.id} name={user.displayName} hasAvatar={user.hasAvatar} size="lg" />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-ink">{user.displayName}</h1>
          <p className="text-sm text-ink/50">@{user.username}</p>
          <p className="mt-0.5 text-xs text-ink/40">Member since {memberSince}</p>
        </div>
      </header>

      {user.bio && <p className="text-sm leading-relaxed text-ink/70">{user.bio}</p>}

      {/* Stats */}
      <section className="grid grid-cols-3 gap-3">
        <Stat label="Finished this year" value={String(finishedThisYear)} />
        <Stat label="Hours read" value={formatReadingTime(totalSeconds)} />
        <Stat label="On shelves" value={String(Object.values(counts).reduce((a, b) => a + b, 0))} />
      </section>

      {/* Currently reading */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink/50">
          Currently reading
        </h2>
        {currentlyReading.length > 0 ? (
          <ul className="space-y-3">
            {currentlyReading.map((b) => (
              <li key={b.bookId}>
                <Link href={`/books/${b.bookId}`} className="flex items-center gap-3">
                  <div className="h-16 w-11 shrink-0 overflow-hidden rounded bg-accent/10">
                    {b.hasCover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/books/${b.bookId}/cover`}
                        alt={b.title}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{b.title}</p>
                    <p className="truncate text-xs text-ink/50">{b.author}</p>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-accent/10">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${Math.min(100, Math.round(b.progressPercent))}%` }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-ink/40">
                    {Math.round(b.progressPercent)}%
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed border-accent/30 p-4 text-sm text-ink/50">
            Not reading anything right now.
          </p>
        )}
      </section>

      {/* Shelf breakdown */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink/50">Shelves</h2>
        <ul className="grid grid-cols-2 gap-2">
          {SHELF_ORDER.map((status) => (
            <li
              key={status}
              className="flex items-center justify-between rounded-lg border border-accent/15 bg-surface/40 px-3 py-2 text-sm"
            >
              <span className="text-ink/70">{SHELF_LABELS[status]}</span>
              <span className="font-semibold text-ink">{counts[status]}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Recent activity */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink/50">
          Recent activity
        </h2>
        {recentActivity.length > 0 ? (
          <ul className="space-y-2">
            {recentActivity.map((event) => (
              <li key={event.id} className="text-sm text-ink/80">
                {formatActivity(event.type, event.payload)}
                {event.book?.title && (
                  <>
                    {" — "}
                    <span className="italic">{event.book.title}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink/50">No activity yet.</p>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-accent/15 bg-surface/40 p-3 text-center">
      <p className="text-xl font-bold text-ink">{value}</p>
      <p className="mt-0.5 text-[11px] leading-tight text-ink/50">{label}</p>
    </div>
  );
}
