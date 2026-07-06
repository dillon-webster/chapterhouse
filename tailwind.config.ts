import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm, "library" palette. Values come from CSS variables in globals.css
        // so the theme follows the OS light/dark setting; <alpha-value> keeps
        // Tailwind opacity modifiers (e.g. text-ink/50) working.
        paper: "rgb(var(--paper) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          light: "rgb(var(--accent-light) / <alpha-value>)",
          dark: "rgb(var(--accent-dark) / <alpha-value>)",
        },
        // Raised card / input fill. White over cream in light mode, a warm lift
        // over charcoal in dark mode — so bg-surface/40 cards and solid inputs
        // both read correctly in either theme.
        surface: "rgb(var(--surface) / <alpha-value>)",
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
