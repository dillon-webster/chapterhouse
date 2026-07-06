"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ShelfStatus } from "@prisma/client";

type Result = {
  openLibraryId: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  pageCount: number | null;
};

// Open Library search panel — for books not in the club's EPUB library.
export function AddBookSearch({ status }: { status: ShelfStatus }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Search failed.");
      setResults(data.results ?? []);
    } catch {
      setError("Search failed.");
      setResults([]);
    } finally {
      setSearching(false);
      setSearched(true);
    }
  }

  async function add(r: Result) {
    setAddingId(r.openLibraryId);
    try {
      const res = await fetch("/api/books/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openLibraryId: r.openLibraryId,
          title: r.title,
          author: r.author,
          coverUrl: r.coverUrl,
          pageCount: r.pageCount,
          status,
        }),
      });
      if (res.ok) {
        setAddedIds((prev) => new Set(prev).add(r.openLibraryId));
        router.refresh();
      }
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div>
      <form onSubmit={search} className="mb-5 flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Open Library by title or author…"
          className="flex-1 rounded-lg border border-accent/30 bg-surface/70 px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={searching}
          className="rounded-lg bg-accent-dark px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-accent disabled:opacity-50"
        >
          {searching ? "…" : "Search"}
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}

      {searched && results.length === 0 && !error && (
        <p className="rounded-lg border border-dashed border-accent/30 p-8 text-center text-sm text-ink/50">
          No results. Try a different title or author.
        </p>
      )}

      <ul className="space-y-3">
        {results.map((r) => {
          const added = addedIds.has(r.openLibraryId);
          return (
            <li
              key={r.openLibraryId}
              className="flex items-center gap-4 rounded-lg border border-accent/15 bg-surface/50 p-3"
            >
              <div className="h-20 w-14 shrink-0 overflow-hidden rounded border border-accent/10 bg-accent/5">
                {r.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center p-1 text-center text-[9px] text-ink/40">
                    {r.title}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.title}</p>
                {r.author && <p className="truncate text-xs text-ink/60">{r.author}</p>}
                {r.pageCount && <p className="mt-0.5 text-xs text-ink/40">{r.pageCount} pages</p>}
              </div>

              <button
                onClick={() => add(r)}
                disabled={added || addingId === r.openLibraryId}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
                  added
                    ? "bg-accent/10 text-accent-dark"
                    : "bg-accent-dark text-paper hover:bg-accent"
                }`}
              >
                {added ? "Added ✓" : addingId === r.openLibraryId ? "Adding…" : "Add"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
