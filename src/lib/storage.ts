import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";

// Single source of truth for where uploaded content lives. On a server this
// resolves to a host directory bind-mounted to /data in the container
// (STORAGE_DIR=/data). Locally it defaults to ./storage.
const STORAGE_DIR = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.join(process.cwd(), "storage");

export const EPUB_DIR = path.join(STORAGE_DIR, "epubs");
export const COVER_DIR = path.join(STORAGE_DIR, "covers");
export const AVATAR_DIR = path.join(STORAGE_DIR, "avatars");

const SUBDIRS = { epubs: EPUB_DIR, covers: COVER_DIR, avatars: AVATAR_DIR } as const;
type StorageKind = keyof typeof SUBDIRS;

/** Create the storage subdirectories if they don't exist. Safe to call repeatedly. */
export async function ensureStorageDirs(): Promise<void> {
  await Promise.all(
    Object.values(SUBDIRS).map((dir) => fs.mkdir(dir, { recursive: true })),
  );
}

/** Absolute path on disk for a stored file, given its kind and relative name. */
export function resolveStoredPath(kind: StorageKind, relativeName: string): string {
  return path.join(SUBDIRS[kind], relativeName);
}

/**
 * Persist a file buffer and return the relative filename to store in the DB
 * (e.g. Book.epubPath / Book.coverPath). Keeps the original extension.
 */
export async function saveFile(
  kind: StorageKind,
  data: Buffer | Uint8Array,
  originalName: string,
): Promise<string> {
  await fs.mkdir(SUBDIRS[kind], { recursive: true });
  const ext = path.extname(originalName) || "";
  const name = `${randomUUID()}${ext}`;
  await fs.writeFile(path.join(SUBDIRS[kind], name), data);
  return name;
}

/** Delete a stored file by kind + relative name. Ignores missing files. */
export async function deleteFile(kind: StorageKind, relativeName: string): Promise<void> {
  try {
    await fs.unlink(path.join(SUBDIRS[kind], relativeName));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

/** Read a stored file's bytes (used by the EPUB/cover streaming routes). */
export function readStoredFile(kind: StorageKind, relativeName: string): Promise<Buffer> {
  return fs.readFile(path.join(SUBDIRS[kind], relativeName));
}
