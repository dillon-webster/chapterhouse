import type { ShelfStatus } from "@prisma/client";

export function buildProgressUpdate({
  existingStatus,
  cfi,
  newPercent,
}: {
  existingStatus: ShelfStatus | null | undefined;
  cfi: string;
  newPercent: number;
}) {
  const isFinished = existingStatus === "FINISHED";

  return {
    currentLocation: cfi,
    progressPercent: isFinished ? 100 : newPercent,
    status: isFinished ? "FINISHED" : "CURRENTLY_READING",
  } satisfies {
    currentLocation: string;
    progressPercent: number;
    status: ShelfStatus;
  };
}
