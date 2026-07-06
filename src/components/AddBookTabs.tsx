"use client";

import { useState } from "react";
import type { ShelfStatus } from "@prisma/client";
import { SHELF_STATUSES, SHELF_LABELS } from "@/lib/shelf";
import { CatalogSearchPanel } from "@/components/CatalogSearchPanel";
import { AddBookSearch } from "@/components/AddBookSearch";

type Tab = "library" | "openLibrary";

export function AddBookTabs() {
  const [tab, setTab] = useState<Tab>("library");
  const [status, setStatus] = useState<ShelfStatus>("WANT_TO_READ");

  return (
    <div>
      {/* Source tabs */}
      <div className="mb-4 flex gap-1 rounded-lg border border-accent/20 bg-accent/5 p-1">
        {(
          [
            ["library", "Club library"],
            ["openLibrary", "Open Library"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
              tab === value
                ? "bg-accent-dark text-paper"
                : "text-accent-dark hover:bg-accent/10"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Shared shelf picker */}
      <label className="mb-5 flex items-center gap-2 text-sm text-ink/70">
        Add to
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ShelfStatus)}
          className="rounded-lg border border-accent/30 bg-surface/70 px-2 py-1.5 text-sm outline-none focus:border-accent"
        >
          {SHELF_STATUSES.map((s) => (
            <option key={s} value={s}>
              {SHELF_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      {tab === "library" ? (
        <CatalogSearchPanel status={status} />
      ) : (
        <AddBookSearch status={status} />
      )}
    </div>
  );
}
