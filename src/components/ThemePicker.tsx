"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { THEMES, type ThemeId } from "@/lib/themes";

// Color-preset picker for the profile page. Selecting a theme applies it
// instantly by flipping <html data-theme> (so the whole app repaints live),
// then persists it through the shared profile PATCH endpoint. On failure it
// reverts to the previously saved theme.
export function ThemePicker({ current }: { current: ThemeId }) {
  const router = useRouter();
  const [selected, setSelected] = useState<ThemeId>(current);
  const [saving, setSaving] = useState<ThemeId | null>(null);
  const [error, setError] = useState<string | null>(null);

  function applyLive(theme: ThemeId) {
    document.documentElement.dataset.theme = theme;
  }

  async function choose(theme: ThemeId) {
    if (theme === selected || saving) return;
    const previous = selected;
    setSelected(theme);
    setSaving(theme);
    setError(null);
    applyLive(theme);

    try {
      const body = new FormData();
      body.set("theme", theme);
      const res = await fetch("/api/profile", { method: "PATCH", body });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Couldn't save your theme.");
      }
      // Refresh so the server-rendered <html data-theme> matches on next load.
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
        <h2 className="text-sm font-semibold text-ink">Theme</h2>
        <p className="text-xs text-ink/60">
          Pick a color palette. Each still follows your device&apos;s light/dark
          setting.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {THEMES.map((t) => {
          const isActive = selected === t.id;
          const [paper, accent, ink] = t.swatch;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => choose(t.id)}
              disabled={!!saving}
              aria-pressed={isActive}
              title={t.description}
              className={`flex items-center gap-3 rounded-lg border p-2.5 text-left transition-colors disabled:opacity-60 ${
                isActive
                  ? "border-accent ring-1 ring-accent"
                  : "border-accent/20 hover:border-accent/50"
              }`}
            >
              <span
                aria-hidden
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 shadow-inner"
                style={{ background: paper }}
              >
                <span
                  className="h-4 w-4 rounded-full"
                  style={{ background: accent, boxShadow: `0 0 0 1.5px ${ink}` }}
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">
                  {t.label}
                </span>
                <span className="block truncate text-[11px] text-ink/55">
                  {saving === t.id ? "Saving…" : isActive ? "Active" : "Preview"}
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
