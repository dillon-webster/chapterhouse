import Link from "next/link";
import { AddBookTabs } from "@/components/AddBookTabs";

export default function AddBookPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-1 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-accent-dark">Add a book</h1>
        <Link href="/shelves" className="text-sm text-accent-dark underline">
          ← Shelves
        </Link>
      </div>
      <p className="mb-6 text-sm text-ink/60">
        Add a book from the <strong>club library</strong> (readable EPUBs), or search{" "}
        <strong>Open Library</strong> to track anything else on your shelves
        (tracking only — no in-app reader).
      </p>

      <AddBookTabs />
    </div>
  );
}
