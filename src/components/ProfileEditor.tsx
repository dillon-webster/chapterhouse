"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const CLOSE_DELAY_MS = 180;

export function ProfileEditor({
  displayName,
  bio,
}: {
  displayName: string;
  bio: string | null;
}) {
  const router = useRouter();
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  function openEditor() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpen(true);
  }

  function closeEditor() {
    setVisible(false);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        body: new FormData(e.currentTarget),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Couldn't save your profile.");
      }
      closeEditor();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={openEditor}
        className="rounded-lg border border-accent/30 px-4 py-2 text-sm text-ink/70 transition-colors hover:border-accent"
      >
        Edit profile
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`space-y-4 rounded-lg border border-accent/20 bg-surface/50 p-4 transition-[opacity,transform] duration-200 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div>
        <label className="mb-1 block text-xs font-semibold text-ink/60">Display name</label>
        <input
          name="displayName"
          defaultValue={displayName}
          maxLength={60}
          required
          className="w-full rounded-lg border border-accent/20 bg-paper px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-ink/60">Bio</label>
        <textarea
          name="bio"
          defaultValue={bio ?? ""}
          maxLength={500}
          rows={3}
          placeholder="Tell the club a bit about your reading…"
          className="w-full resize-none rounded-lg border border-accent/20 bg-paper px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-ink/60">Avatar</label>
        <input
          name="avatar"
          type="file"
          accept="image/*"
          className="block w-full text-sm text-ink/70 file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:text-paper"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={closeEditor}
          disabled={saving}
          className="rounded-lg border border-accent/20 px-4 py-2 text-sm text-ink/70"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-paper disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
