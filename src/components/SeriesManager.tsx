"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseSeriesFromTitle } from "@/lib/series";

interface BookRow {
  id: string;
  title: string;
  author: string;
  series: string | null;
  seriesIndex: number | null;
}

// Editable value per row; index kept as a string for the number input.
interface Draft {
  series: string;
  index: string;
}

const toDraft = (b: BookRow): Draft => ({
  series: b.series ?? "",
  index: b.seriesIndex != null ? String(b.seriesIndex) : "",
});

// Sort so same-series books sit together (unassigned last), then by index, then
// title. Applied once for display order; edits don't reorder mid-typing.
function sortBooks(books: BookRow[]): BookRow[] {
  return [...books].sort((a, z) => {
    const as = a.series ?? "";
    const zs = z.series ?? "";
    if (as !== zs) {
      if (as === "") return 1;
      if (zs === "") return -1;
      return as.localeCompare(zs);
    }
    const ai = a.seriesIndex ?? Infinity;
    const zi = z.seriesIndex ?? Infinity;
    if (ai !== zi) return ai - zi;
    return a.title.localeCompare(z.title);
  });
}

export function SeriesManager({ books }: { books: BookRow[] }) {
  const router = useRouter();
  const ordered = useMemo(() => sortBooks(books), [books]);

  // Original values (for dirty-checking) and the live drafts, both keyed by id.
  const original = useMemo(() => {
    const m = new Map<string, Draft>();
    for (const b of books) m.set(b.id, toDraft(b));
    return m;
  }, [books]);

  const [drafts, setDrafts] = useState<Map<string, Draft>>(
    () => new Map(original),
  );
  // Re-baseline drafts whenever the server data changes (mount + after a save's
  // router.refresh()). `original` only changes when the `books` prop does, not
  // on local edits, so in-progress typing is never clobbered. This keeps drafts
  // in sync with server-normalized values and drops any stale/added-book ids.
  useEffect(() => {
    setDrafts(new Map(original));
  }, [original]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  function setDraft(id: string, patch: Partial<Draft>) {
    setDrafts((prev) => {
      const next = new Map(prev);
      next.set(id, { ...next.get(id)!, ...patch });
      return next;
    });
    setStatus("idle");
  }

  // Dirty rows: draft differs from original.
  const dirtyIds = useMemo(() => {
    const ids: string[] = [];
    for (const [id, d] of drafts) {
      const o = original.get(id);
      if (!o) continue; // book no longer present (drafts not yet re-synced)
      if (d.series !== o.series || d.index !== o.index) ids.push(id);
    }
    return ids;
  }, [drafts, original]);

  // Fill in series/index from title patterns for rows that don't have a series
  // yet. Never clobbers a value already entered.
  function suggestFromTitles() {
    let filled = 0;
    setDrafts((prev) => {
      const next = new Map(prev);
      for (const b of ordered) {
        const d = next.get(b.id)!;
        if (d.series.trim() !== "") continue;
        const guess = parseSeriesFromTitle(b.title);
        if (!guess) continue;
        next.set(b.id, {
          series: guess.series,
          index: guess.seriesIndex != null ? String(guess.seriesIndex) : "",
        });
        filled++;
      }
      return next;
    });
    setStatus("idle");
    setMessage(filled > 0 ? `Suggested ${filled} — review, then save.` : "No new suggestions found.");
  }

  async function saveAll() {
    if (dirtyIds.length === 0) return;
    setStatus("saving");
    setMessage(null);

    const updates = dirtyIds.map((id) => {
      const d = drafts.get(id)!;
      return { id, series: d.series, seriesIndex: d.index };
    });

    let res: Response;
    try {
      res = await fetch("/api/admin/books/series", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
    } catch {
      setStatus("error");
      setMessage("Save failed — check your connection.");
      return;
    }

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setStatus("error");
      setMessage(json.error ?? "Save failed.");
      return;
    }

    setStatus("saved");
    setMessage(`Saved ${updates.length} book${updates.length === 1 ? "" : "s"}.`);
    router.refresh(); // re-fetch so a fresh load reflects the new grouping/order
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-accent-dark">Manage catalog</h1>
          <p className="text-sm text-ink/50">Assign books to series and set their order.</p>
        </div>
        <Link href="/catalog" className="text-sm text-accent-dark hover:underline">
          ← Catalog
        </Link>
      </div>

      <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-3 border-b border-accent/10 bg-paper/95 py-3 backdrop-blur">
        <button
          onClick={suggestFromTitles}
          className="rounded-lg bg-accent/15 px-4 py-2 text-sm font-medium text-accent-dark transition-colors hover:bg-accent/25"
        >
          Suggest from titles
        </button>
        <button
          onClick={saveAll}
          disabled={dirtyIds.length === 0 || status === "saving"}
          className="rounded-lg bg-accent-dark px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-accent disabled:opacity-40"
        >
          {status === "saving" ? "Saving…" : `Save all${dirtyIds.length ? ` (${dirtyIds.length})` : ""}`}
        </button>
        {message && (
          <span className={`text-sm ${status === "error" ? "text-red-600" : "text-ink/60"}`}>
            {message}
          </span>
        )}
      </div>

      <div className="divide-y divide-accent/10">
        {ordered.map((b) => {
          // Fall back to the book's own values if drafts hasn't re-synced to a
          // just-added book yet (the effect fixes it on the next tick).
          const d = drafts.get(b.id) ?? toDraft(b);
          const o = original.get(b.id) ?? d;
          const dirty = d.series !== o.series || d.index !== o.index;
          return (
            <div key={b.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink" title={b.title}>
                  {b.title}
                </p>
                <p className="truncate text-xs text-ink/50">{b.author}</p>
              </div>
              <input
                type="text"
                value={d.series}
                onChange={(e) => setDraft(b.id, { series: e.target.value })}
                placeholder="Series"
                className={`w-44 rounded-lg border px-3 py-2 text-sm text-ink ${dirty ? "border-accent" : "border-accent/20"}`}
              />
              <input
                type="number"
                step="any"
                value={d.index}
                onChange={(e) => setDraft(b.id, { index: e.target.value })}
                placeholder="#"
                className={`w-16 rounded-lg border px-3 py-2 text-sm text-ink ${dirty ? "border-accent" : "border-accent/20"}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
