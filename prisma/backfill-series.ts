import "dotenv/config";
import { prisma } from "../src/lib/prisma";

// One-off backfill that assigns series + index to the books already in the
// catalog (EPUBs carry no series metadata, so this can't happen on import).
// Idempotent: matches on title + author and is safe to re-run. New books get
// their series via the admin "Save series" control on the book page.
const ASSIGNMENTS: { title: string; author: string; series: string; index: number }[] = [
  { title: "Unsouled", author: "Will Wight", series: "Cradle", index: 1 },
  { title: "Soulsmith", author: "Will Wight", series: "Cradle", index: 2 },
  { title: "A Game of Thrones", author: "George R. R. Martin", series: "A Song of Ice and Fire", index: 1 },
  { title: "A Clash of Kings", author: "George R. R. Martin", series: "A Song of Ice and Fire", index: 2 },
  { title: "A Storm of Swords", author: "George R. R. Martin", series: "A Song of Ice and Fire", index: 3 },
  { title: "A Feast for Crows", author: "George R. R. Martin", series: "A Song of Ice and Fire", index: 4 },
];

async function main() {
  console.log(`Backfilling series for ${ASSIGNMENTS.length} book(s)…`);
  for (const a of ASSIGNMENTS) {
    const result = await prisma.book.updateMany({
      where: { title: a.title, author: a.author },
      data: { series: a.series, seriesIndex: a.index },
    });
    if (result.count > 0) {
      console.log(`  ✓ ${a.title} → ${a.series} #${a.index}`);
    } else {
      console.log(`  – ${a.title}: not found, skipped`);
    }
  }
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
