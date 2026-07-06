import type { ShelfStatus } from "@prisma/client";

// Human-readable labels + canonical display order for shelf statuses.
// Shared by the shelf API, the per-book controls, the /shelves view, and the
// activity feed so the four stay in sync.
export const SHELF_STATUSES = [
  "WANT_TO_READ",
  "CURRENTLY_READING",
  "FINISHED",
  "DNF",
] as const satisfies readonly ShelfStatus[];

export const SHELF_LABELS: Record<ShelfStatus, string> = {
  WANT_TO_READ: "Want to read",
  CURRENTLY_READING: "Currently reading",
  FINISHED: "Finished",
  DNF: "Did not finish",
};

// Per-shelf accent + flavor text for the bookcase view on /shelves.
export const SHELF_ACCENTS: Record<ShelfStatus, string> = {
  CURRENTLY_READING: "#8b5e34",
  WANT_TO_READ: "#4a6fa5",
  FINISHED: "#3f7d5f",
  DNF: "#9b5a5a",
};

export const SHELF_EMPTY_MESSAGES: Record<ShelfStatus, string> = {
  CURRENTLY_READING: "Nothing open right now.",
  WANT_TO_READ: "Your next great\nadventure awaits.",
  FINISHED: "Celebrate the stories\nyou've completed.",
  DNF: "Not every story is\nmeant to be finished.",
};
