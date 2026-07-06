import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { readStoredFile } from "../src/lib/storage";
import { extractEpubMeta } from "../src/lib/epub";
import { generateSpine } from "../src/lib/spine";

// One-off backfill for books imported before spines/pageCount existed.
// Recomputes pageCount from the stored EPUB when missing, then generates a
// spine. Pass --force to regenerate spines that already exist.
async function main() {
  const force = process.argv.includes("--force");
  const books = await prisma.book.findMany();
  console.log(`Backfilling ${books.length} book(s)${force ? " (force)" : ""}…`);

  for (const book of books) {
    if (book.pageCount == null && book.epubPath) {
      try {
        const buf = await readStoredFile("epubs", book.epubPath);
        const meta = extractEpubMeta(buf);
        if (meta.pageCount != null) {
          await prisma.book.update({
            where: { id: book.id },
            data: { pageCount: meta.pageCount },
          });
          console.log(`  pages ${book.title}: ${meta.pageCount}`);
        }
      } catch (e) {
        console.error(`  ✘ pages ${book.title}:`, (e as Error).message);
      }
    }

    await generateSpine(book.id, force);
    console.log(`  ✓ spine ${book.title}`);
  }

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
