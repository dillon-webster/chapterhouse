"use client";

import { useRouter } from "next/navigation";

// Returns to wherever the user came from (catalog, shelves, dashboard…),
// falling back to /shelves if there's no history (e.g. opened via deep link).
export function BackButton() {
  const router = useRouter();

  function back() {
    if (window.history.length > 1) router.back();
    else router.push("/shelves");
  }

  return (
    <button
      onClick={back}
      className="mb-4 inline-flex items-center gap-1 text-sm text-accent-dark transition-colors hover:text-accent"
    >
      <span aria-hidden>←</span> Back
    </button>
  );
}
