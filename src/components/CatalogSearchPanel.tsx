"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ShelfStatus } from "@prisma/client";

type Result = {
  id: string;
  title: string;
  author: string;
  hasCover: boolean;
  pageCount: number | null;
};

// Club-library panel — add a book that's already in the EPUB catalog to a shelf.
export function CatalogSearchPanel({ status }: { status: ShelfStatus }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  async function load(q: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/catalog/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  // Browse recent catalog books on first open.
  useEffect(() => {
    load("");
  }, []);

  async function add(r: Result) {
    setAddingId(r.id);
    try {
      const res = await fetch(`/api/books/${r.id}/shelf`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setAddedIds((prev) => new Set(prev).add(r.id));
        router.refresh();
      }
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(query.trim());
        }}
        className="mb-5 flex gap-2"
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the club library…"
          className="flex-1 rounded-lg border border-accent/30 bg-surface/70 px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-accent-dark px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-accent disabled:opacity-50"
        >
          {loading ? "…" : "Search"}
        </button>
      </form>

      {!loading && results.length === 0 && (
        <p className="rounded-lg border border-dashed border-accent/30 p-8 text-center text-sm text-ink/50">
          No books in the library match. Try the Open Library tab.
        </p>
      )}

      <ul className="space-y-3">
        {results.map((r) => {
          const added = addedIds.has(r.id);
          return (
            <li
              key={r.id}
              className="flex items-center gap-4 rounded-lg border border-accent/15 bg-surface/50 p-3"
            >
              <div className="h-20 w-14 shrink-0 overflow-hidden rounded border border-accent/10 bg-accent/5">
                {r.hasCover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/books/${r.id}/cover`}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-1 text-center text-[9px] text-ink/40">
                    {r.title}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.title}</p>
                <p className="truncate text-xs text-ink/60">{r.author}</p>
                {r.pageCount && <p className="mt-0.5 text-xs text-ink/40">{r.pageCount} pages</p>}
              </div>

              <button
                onClick={() => add(r)}
                disabled={added || addingId === r.id}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
                  added ? "bg-accent/10 text-accent-dark" : "bg-accent-dark text-paper hover:bg-accent"
                }`}
              >
                {added ? "Added ✓" : addingId === r.id ? "Adding…" : "Add"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
