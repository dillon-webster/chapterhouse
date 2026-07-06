"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatActivity, type ActivityItem } from "@/lib/activityFormat";

const POLL_MS = 20_000;

export function ActivityFeed({ initial }: { initial: ActivityItem[] }) {
  const [events, setEvents] = useState(initial);
  // Keep the latest list in a ref so the interval callback can compare without
  // being re-created (which would reset the timer).
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/activity", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { events: ActivityItem[] };
        if (cancelled) return;
        // Only update state when the newest event changed, to avoid needless
        // re-renders on every poll.
        if (data.events[0]?.id !== eventsRef.current[0]?.id) {
          setEvents(data.events);
        }
      } catch {
        /* transient network error — try again next tick */
      }
    }

    const interval = setInterval(poll, POLL_MS);
    // Refresh on tab refocus so the feed is current when you come back.
    const onVisible = () => {
      if (document.visibilityState === "visible") poll();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (events.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-accent/30 p-5 text-sm leading-6 text-ink/50">
        No activity yet. Add a book to your shelf and start reading to see the
        feed come alive.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-accent/10">
      {events.map((event) => (
        <li key={event.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent/70" />
          <p className="min-w-0 text-sm leading-6 text-ink/75">
            <Link
              href={`/u/${event.user.username}`}
              className="font-semibold text-ink transition-colors hover:text-accent-dark"
            >
              {event.user.displayName}
            </Link>{" "}
            {formatActivity(event.type, event.payload)}
            {event.book?.title && (
              <>
                {" "}
                <span className="text-ink/35">-</span>{" "}
                <span className="italic text-ink/65">{event.book.title}</span>
              </>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
