"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ShelfStatus } from "@prisma/client";
import { SHELF_STATUSES, SHELF_LABELS } from "@/lib/shelf";

export function ShelfControls({
  bookId,
  status,
}: {
  bookId: string;
  status: ShelfStatus | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(next: ShelfStatus) {
    if (next === status) return;
    setBusy(true);
    await fetch(`/api/books/${bookId}/shelf`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    router.refresh();
    setBusy(false);
  }

  async function remove() {
    setBusy(true);
    await fetch(`/api/books/${bookId}/shelf`, { method: "DELETE" });
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="mt-5">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink/50">
        Your shelf
      </p>
      <div className="flex flex-wrap gap-2">
        {SHELF_STATUSES.map((s) => {
          const active = s === status;
          return (
            <button
              key={s}
              onClick={() => setStatus(s)}
              disabled={busy}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                active
                  ? "bg-accent-dark text-paper"
                  : "bg-accent/10 text-accent-dark hover:bg-accent/20"
              }`}
            >
              {SHELF_LABELS[s]}
            </button>
          );
        })}
      </div>
      {status && (
        <button
          onClick={remove}
          disabled={busy}
          className="mt-2 text-xs text-ink/50 underline transition-colors hover:text-ink/80 disabled:opacity-50"
        >
          Remove from shelf
        </button>
      )}
    </div>
  );
}
