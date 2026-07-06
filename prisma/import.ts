import "dotenv/config";
import { importBooks } from "../src/lib/importBooks";

async function main() {
  const result = await importBooks();
  const total = result.imported + result.skipped + result.failed.length;

  console.log(`Found ${total} EPUB(s), ${result.imported} new.`);
  for (const f of result.failed) {
    console.error(`  ✘ ${f.filename}: ${f.error}`);
  }
  console.log(`\nDone. ${result.imported} imported, ${result.skipped} skipped, ${result.failed.length} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
