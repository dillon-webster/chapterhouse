"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BookAdminActions({
  bookId,
  isCurrentPick,
  series,
  seriesIndex,
}: {
  bookId: string;
  isCurrentPick: boolean;
  series: string | null;
  seriesIndex: number | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [seriesName, setSeriesName] = useState(series ?? "");
  const [indexValue, setIndexValue] = useState(
    seriesIndex != null ? String(seriesIndex) : "",
  );
  const [saved, setSaved] = useState(false);

  async function handlePick() {
    setBusy(true);
    await fetch(`/api/books/${bookId}/pick`, { method: "PATCH" });
    router.refresh();
    setBusy(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this book? This cannot be undone.")) return;
    setBusy(true);
    await fetch(`/api/books/${bookId}`, { method: "DELETE" });
    router.push("/catalog");
    router.refresh();
  }

  async function handleSaveSeries() {
    setBusy(true);
    setSaved(false);
    await fetch(`/api/books/${bookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        series: seriesName,
        seriesIndex: indexValue === "" ? null : Number(indexValue),
      }),
    });
    router.refresh();
    setBusy(false);
    setSaved(true);
  }

  return (
    <div className="mt-6 space-y-4 border-t border-accent/10 pt-6">
      <div className="flex flex-wrap gap-2">
        {!isCurrentPick && (
          <button
            onClick={handlePick}
            disabled={busy}
            className="rounded-lg bg-accent/15 px-4 py-2 text-sm font-medium text-accent-dark transition-colors hover:bg-accent/25 disabled:opacity-50"
          >
            Set as current pick
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={busy}
          className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
        >
          Delete book
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-xs font-medium text-ink/60">
          Series
          <input
            type="text"
            value={seriesName}
            onChange={(e) => {
              setSeriesName(e.target.value);
              setSaved(false);
            }}
            placeholder="e.g. Cradle"
            className="mt-1 w-48 rounded-lg border border-accent/20 px-3 py-2 text-sm text-ink"
          />
        </label>
        <label className="flex flex-col text-xs font-medium text-ink/60">
          #
          <input
            type="number"
            step="any"
            value={indexValue}
            onChange={(e) => {
              setIndexValue(e.target.value);
              setSaved(false);
            }}
            placeholder="1"
            className="mt-1 w-20 rounded-lg border border-accent/20 px-3 py-2 text-sm text-ink"
          />
        </label>
        <button
          onClick={handleSaveSeries}
          disabled={busy}
          className="rounded-lg bg-accent/15 px-4 py-2 text-sm font-medium text-accent-dark transition-colors hover:bg-accent/25 disabled:opacity-50"
        >
          Save series
        </button>
        {saved && <span className="pb-2 text-sm text-ink/50">Saved.</span>}
      </div>
    </div>
  );
}
