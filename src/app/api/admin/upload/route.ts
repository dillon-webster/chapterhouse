import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveFile } from "@/lib/storage";
import { importBooks } from "@/lib/importBooks";
import { checkEpubUpload } from "@/lib/upload";

export const runtime = "nodejs";

// Admin EPUB upload. Lets an admin add books straight from the browser — the
// container writes each file into STORAGE_DIR/epubs itself, so no host-side
// file copying (or chown) is ever needed — then runs the normal import so
// metadata, covers, and spines are extracted exactly as with the folder-drop
// flow. Returns the same shape as /api/admin/import, plus any `rejected` files.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  const rejected: { filename: string; error: string }[] = [];
  let saved = 0;

  for (const file of files) {
    const check = checkEpubUpload(file.name, file.size);
    if (!check.ok) {
      rejected.push({ filename: file.name, error: check.reason });
      continue;
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    await saveFile("epubs", buffer, file.name);
    saved++;
  }

  // Nothing landed on disk — don't bother scanning; report why.
  if (saved === 0) {
    return NextResponse.json(
      { imported: 0, skipped: 0, failed: [], rejected },
      { status: 400 },
    );
  }

  const result = await importBooks();
  return NextResponse.json({ ...result, rejected });
}
