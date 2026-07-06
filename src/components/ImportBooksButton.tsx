"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ImportBooksButton() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleImport() {
    setStatus("running");
    setMessage(null);

    const res = await fetch("/api/admin/import", { method: "POST" });
    const json = await res.json();

    if (!res.ok) {
      setStatus("error");
      setMessage(json.error ?? "Import failed.");
      return;
    }

    const { imported, skipped, failed } = json;
    const parts = [];
    if (imported > 0) parts.push(`${imported} imported`);
    if (skipped > 0) parts.push(`${skipped} already in catalog`);
    if (failed.length > 0) parts.push(`${failed.length} failed`);
    setMessage(parts.length > 0 ? parts.join(", ") : "No new EPUBs found.");
    setStatus("done");

    if (imported > 0) router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {message && (
        <span className={`text-sm ${status === "error" ? "text-red-600" : "text-ink/60"}`}>
          {message}
        </span>
      )}
      <button
        onClick={handleImport}
        disabled={status === "running"}
        className="rounded-lg bg-accent/15 px-4 py-2 text-sm font-medium text-accent-dark transition-colors hover:bg-accent/25 disabled:opacity-50"
      >
        {status === "running" ? "Scanning…" : "Import books"}
      </button>
    </div>
  );
}
