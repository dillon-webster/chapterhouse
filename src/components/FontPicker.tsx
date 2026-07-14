"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FONTS, type FontId } from "@/lib/fonts";

// UI font picker for the profile page. Selecting a font applies it instantly by
// flipping <html data-font> (so the whole app repaints live), then persists it
// through the shared profile PATCH endpoint. On failure it reverts to the
// previously saved font. Mirrors ThemePicker.
export function FontPicker({ current }: { current: FontId }) {
  const router = useRouter();
  const [selected, setSelected] = useState<FontId>(current);
  const [saving, setSaving] = useState<FontId | null>(null);
  const [error, setError] = useState<string | null>(null);

  function applyLive(font: FontId) {
    document.documentElement.dataset.font = font;
  }

  async function choose(font: FontId) {
    if (font === selected || saving) return;
    const previous = selected;
    setSelected(font);
    setSaving(font);
    setError(null);
    applyLive(font);

    try {
      const body = new FormData();
      body.set("font", font);
      const res = await fetch("/api/profile", { method: "PATCH", body });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Couldn't save your font.");
      }
      // Refresh so the server-rendered <html data-font> matches on next load.
      router.refresh();
    } catch (err) {
      setSelected(previous);
      applyLive(previous);
      setError((err as Error).message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-accent/20 bg-surface/50 p-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">Font</h2>
        <p className="text-xs text-ink/60">
          Pick the typeface used across the app.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {FONTS.map((f) => {
          const isActive = selected === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => choose(f.id)}
              disabled={!!saving}
              aria-pressed={isActive}
              title={f.description}
              className={`flex items-center gap-3 rounded-lg border p-2.5 text-left transition-colors disabled:opacity-60 ${
                isActive
                  ? "border-accent ring-1 ring-accent"
                  : "border-accent/20 hover:border-accent/50"
              }`}
            >
              <span
                aria-hidden
                style={{ fontFamily: f.stack }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-paper text-base font-semibold text-ink"
              >
                Aa
              </span>
              <span className="min-w-0">
                <span
                  style={{ fontFamily: f.stack }}
                  className="block truncate text-sm font-medium text-ink"
                >
                  {f.label}
                </span>
                <span className="block truncate text-[11px] text-ink/55">
                  {saving === f.id ? "Saving…" : isActive ? "Active" : "Preview"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
