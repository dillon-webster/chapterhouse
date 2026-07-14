// ---------------------------------------------------------------------------
// Font registry — the single source of truth for the UI font presets.
//
// Every stack is built from OS-native, web-safe families (no web-font
// downloads), so the app stays fully offline and self-hosted. The active preset
// is applied via `[data-font="<id>"]` on <html> (set server-side in
// app/layout.tsx from the signed-in user's saved font), which selects an
// `--app-font` stack in globals.css that the body renders in.
//
// The `stack` values here mirror the [data-font] rules in globals.css and also
// drive the live "Aa" preview in the picker — keep the two in sync.
// ---------------------------------------------------------------------------

export type FontId = "serif" | "book" | "sans" | "rounded" | "mono";

export type FontDef = {
  id: FontId;
  label: string;
  description: string;
  // CSS font-family stack; must match the matching [data-font] rule in globals.css.
  stack: string;
};

export const FONTS: readonly FontDef[] = [
  {
    id: "serif",
    label: "Serif",
    description: "Georgia — the classic library look.",
    stack: 'Georgia, Cambria, "Times New Roman", serif',
  },
  {
    id: "book",
    label: "Book",
    description: "Old-style print serif, warm and roomy.",
    stack:
      '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
  },
  {
    id: "sans",
    label: "Sans",
    description: "Clean system sans-serif.",
    stack:
      'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  {
    id: "rounded",
    label: "Rounded",
    description: "Soft rounded sans on Apple, sans elsewhere.",
    stack:
      'ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", system-ui, sans-serif',
  },
  {
    id: "mono",
    label: "Mono",
    description: "Monospace, typewriter feel.",
    stack: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  },
] as const;

export const DEFAULT_FONT: FontId = "serif";

const FONT_IDS = new Set<string>(FONTS.map((f) => f.id));

/** Narrow an untrusted string to a known FontId, else null. */
export function parseFont(value: unknown): FontId | null {
  return typeof value === "string" && FONT_IDS.has(value)
    ? (value as FontId)
    : null;
}

/** Coerce any value to a valid FontId, falling back to the default. */
export function normalizeFont(value: unknown): FontId {
  return parseFont(value) ?? DEFAULT_FONT;
}
