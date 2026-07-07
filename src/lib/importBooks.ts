import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "./prisma";
import { extractEpubMeta } from "./epub";
import { saveFile } from "./storage";
import { generateSpine } from "./spine";
import { findMatchingBook } from "./bookMatch";

const STORAGE_DIR = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.join(process.cwd(), "storage");
const EPUB_DIR = path.join(STORAGE_DIR, "epubs");

export interface ImportResult {
  imported: number;
  skipped: number;
  failed: { filename: string; error: string }[];
}

// Split a directory listing into EPUBs that still need importing vs. ones
// already in the catalog. Case-insensitive on the extension; non-EPUB entries
// are ignored entirely (neither imported nor counted as skipped).
export function selectNewEpubs(
  entries: string[],
  existingPaths: Iterable<string>,
): { newFiles: string[]; skipped: number } {
  const existing = new Set(existingPaths);
  const epubs = entries.filter((f) => f.toLowerCase().endsWith(".epub"));
  const newFiles = epubs.filter((f) => !existing.has(f));
  return { newFiles, skipped: epubs.length - newFiles.length };
}

export async function importBooks(): Promise<ImportResult> {
  let entries: string[];
  try {
    entries = await fs.readdir(EPUB_DIR);
  } catch {
    return { imported: 0, skipped: 0, failed: [] };
  }

  const existing = await prisma.book.findMany({ select: { epubPath: true } });
  const existingPaths = existing
    .map((b) => b.epubPath)
    .filter((p): p is string => p !== null);

  const { newFiles, skipped } = selectNewEpubs(entries, existingPaths);

  let imported = 0;
  const failed: { filename: string; error: string }[] = [];

  for (const filename of newFiles) {
    try {
      const buffer = await fs.readFile(path.join(EPUB_DIR, filename));
      const meta = extractEpubMeta(buffer);

      let coverPath: string | null = null;
      if (meta.coverBuffer) {
        coverPath = await saveFile("covers", meta.coverBuffer, `cover${meta.coverExtension}`);
      }

      // If this work was already tracked from Open Library, upgrade that record
      // in place (preserving everyone's shelf entries) instead of duplicating.
      const existing = await findMatchingBook(meta.title, meta.author);

      let book;
      if (existing) {
        book = await prisma.book.update({
          where: { id: existing.id },
          data: {
            source: "EPUB",
            epubPath: filename,
            pageCount: meta.pageCount,
            // Prefer the EPUB's own cover/description; fall back to existing.
            ...(coverPath ? { coverPath } : {}),
            ...(meta.description ? { description: meta.description } : {}),
            // Regenerate the spine from the EPUB cover.
            spineImageData: null,
          },
        });
      } else {
        book = await prisma.book.create({
          data: {
            title: meta.title,
            author: meta.author,
            description: meta.description,
            epubPath: filename,
            coverPath,
            pageCount: meta.pageCount,
          },
        });
      }

      // Best-effort spine generation — never let it fail the import.
      await generateSpine(book.id).catch(() => {});

      imported++;
    } catch (err) {
      failed.push({ filename, error: (err as Error).message });
    }
  }

  return { imported, skipped, failed };
}
