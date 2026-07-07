// Validation for admin EPUB uploads. Kept dependency-free so the rules can be
// unit-tested without the request/File machinery. The API route applies these
// to each uploaded file before writing it to storage.

// Generous ceiling — EPUBs are usually a few MB, but image-heavy ones can be
// tens of MB. Guards against a single upload filling the disk.
export const MAX_EPUB_BYTES = 100 * 1024 * 1024; // 100 MB

export type UploadCheck = { ok: true } | { ok: false; reason: string };

/**
 * Decide whether an uploaded file is an acceptable EPUB. Gates on the `.epub`
 * extension (case-insensitive) rather than MIME type, which browsers report
 * inconsistently for EPUBs, plus a non-empty size under the ceiling.
 */
export function checkEpubUpload(
  name: string,
  size: number,
  maxBytes: number = MAX_EPUB_BYTES,
): UploadCheck {
  if (!name.toLowerCase().endsWith(".epub")) {
    return { ok: false, reason: "not an .epub file" };
  }
  if (size <= 0) {
    return { ok: false, reason: "file is empty" };
  }
  if (size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    return { ok: false, reason: `larger than ${mb} MB` };
  }
  return { ok: true };
}
