"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Admin control: upload EPUB files straight from the browser. The server writes
// them into storage and runs the normal import, so admins never need shell
// access or to touch the host filesystem to add books.
export function UploadBooksButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleFiles(files: FileList) {
    setStatus("uploading");
    setMessage(null);

    const form = new FormData();
    for (const file of Array.from(files)) form.append("files", file);

    let res: Response;
    try {
      res = await fetch("/api/admin/upload", { method: "POST", body: form });
    } catch {
      setStatus("error");
      setMessage("Upload failed — check your connection.");
      return;
    }

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setStatus("error");
      setMessage(json.error ?? "Upload failed.");
      return;
    }

    const { imported = 0, skipped = 0, failed = [], rejected = [] } = json;
    const parts: string[] = [];
    if (imported > 0) parts.push(`${imported} added`);
    if (skipped > 0) parts.push(`${skipped} already in catalog`);
    if (failed.length > 0) parts.push(`${failed.length} failed to read`);
    if (rejected.length > 0) parts.push(`${rejected.length} skipped (not EPUBs)`);
    setMessage(parts.length > 0 ? parts.join(", ") : "Nothing to add.");
    setStatus(failed.length > 0 || rejected.length > 0 ? "error" : "done");

    if (imported > 0) router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {message && (
        <span className={`text-sm ${status === "error" ? "text-red-600" : "text-ink/60"}`}>
          {message}
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".epub,application/epub+zip"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
          // Reset so re-selecting the same file fires onChange again.
          e.target.value = "";
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={status === "uploading"}
        className="rounded-lg bg-accent/15 px-4 py-2 text-sm font-medium text-accent-dark transition-colors hover:bg-accent/25 disabled:opacity-50"
      >
        {status === "uploading" ? "Uploading…" : "Upload EPUBs"}
      </button>
    </div>
  );
}
