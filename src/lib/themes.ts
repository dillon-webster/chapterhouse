// ---------------------------------------------------------------------------
// Theme registry — the single source of truth for the color presets.
//
// The actual palettes live in globals.css, keyed by `[data-theme="<id>"]`.
// Each theme defines light values and a `prefers-color-scheme: dark` override,
// so every theme still follows the OS light/dark setting — this only chooses
// the hue family.
//
// The `swatch` colors here are only for the picker chips on the profile page;
// they don't drive the running app (that's globals.css). Keep them roughly in
// sync with each theme's light accent/paper so the chips read true.
// ---------------------------------------------------------------------------

export type ThemeId =
  | "brown"
  | "forest"
  | "slate"
  | "plum"
  | "gruvbox"
  | "catppuccin"
  | "tokyonight";

export type ThemeDef = {
  id: ThemeId;
  label: string;
  description: string;
  // [paper, accent, ink] — used to render the picker swatch, light-mode values.
  swatch: readonly [paper: string, accent: string, ink: string];
};

export const THEMES: readonly ThemeDef[] = [
  {
    id: "brown",
    label: "Classic Brown",
    description: "Warm library oak — the original look.",
    swatch: ["#faf8f3", "#8b5e34", "#1c1917"],
  },
  {
    id: "forest",
    label: "Forest",
    description: "Sage & deep green with a woodland calm.",
    swatch: ["#f4f6f0", "#3f7d4e", "#1a201a"],
  },
  {
    id: "slate",
    label: "Slate",
    description: "Cool blue-grey, ink on linen.",
    swatch: ["#f2f5f8", "#3d6a99", "#1b2430"],
  },
  {
    id: "plum",
    label: "Plum",
    description: "Deep wine accents, dark-academia mood.",
    swatch: ["#f7f2f5", "#8a3d5f", "#241820"],
  },
  {
    id: "gruvbox",
    label: "Gruvbox",
    description: "Retro warmth — the Neovim classic.",
    swatch: ["#fbf1c7", "#d65d0e", "#3c3836"],
  },
  {
    id: "catppuccin",
    label: "Catppuccin",
    description: "Soft mauve pastels (Latte / Mocha).",
    swatch: ["#eff1f5", "#8839ef", "#4c4f69"],
  },
  {
    id: "tokyonight",
    label: "Tokyo Night",
    description: "Cool neon blues (Day / Night).",
    swatch: ["#e1e2e7", "#2e7de9", "#343b58"],
  },
] as const;

export const DEFAULT_THEME: ThemeId = "brown";

const THEME_IDS = new Set<string>(THEMES.map((t) => t.id));

/** Narrow an untrusted string to a known ThemeId, else null. */
export function parseTheme(value: unknown): ThemeId | null {
  return typeof value === "string" && THEME_IDS.has(value)
    ? (value as ThemeId)
    : null;
}

/** Coerce any value to a valid ThemeId, falling back to the default. */
export function normalizeTheme(value: unknown): ThemeId {
  return parseTheme(value) ?? DEFAULT_THEME;
}
