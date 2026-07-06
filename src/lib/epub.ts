import AdmZip from "adm-zip";

export interface EpubMeta {
  title: string;
  author: string;
  description: string | null;
  coverBuffer: Buffer | null;
  coverExtension: string;
  // Rough page estimate from the book's text length (~1800 chars/page). Used
  // to vary spine thickness on the shelf, not for exact pagination.
  pageCount: number | null;
}

const CHARS_PER_PAGE = 1800;

// Sum the visible text across all (X)HTML content documents to estimate length.
function estimatePageCount(zip: AdmZip): number | null {
  let chars = 0;
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    if (!/\.x?html?$/i.test(entry.entryName)) continue;
    const text = entry
      .getData()
      .toString("utf8")
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ");
    chars += text.length;
  }
  if (chars === 0) return null;
  return Math.max(1, Math.round(chars / CHARS_PER_PAGE));
}

function extractDcText(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<dc:${tag}[^>]*>([^<]+)<\/dc:${tag}>`, "i"));
  return match ? match[1].trim() : null;
}

export function extractEpubMeta(buffer: Buffer): EpubMeta {
  const zip = new AdmZip(buffer);

  // Locate OPF file via META-INF/container.xml
  const containerXml = zip.readAsText("META-INF/container.xml");
  const opfMatch = containerXml.match(/full-path="([^"]+\.opf)"/i);
  if (!opfMatch) throw new Error("Could not find OPF file in EPUB");

  const opfPath = opfMatch[1];
  const opfXml = zip.readAsText(opfPath);
  const opfDir = opfPath.includes("/")
    ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1)
    : "";

  const title = extractDcText(opfXml, "title") ?? "Untitled";
  const author = extractDcText(opfXml, "creator") ?? "Unknown Author";
  const description = extractDcText(opfXml, "description");

  // Resolve cover: meta[name=cover] -> manifest item href
  let coverBuffer: Buffer | null = null;
  let coverExtension = ".jpg";

  const coverMetaMatch =
    opfXml.match(/<meta[^>]+name="cover"[^>]+content="([^"]+)"/i) ??
    opfXml.match(/<meta[^>]+content="([^"]+)"[^>]+name="cover"/i);

  if (coverMetaMatch) {
    const coverId = coverMetaMatch[1];
    const itemMatch =
      opfXml.match(new RegExp(`<item[^>]+id="${coverId}"[^>]+href="([^"]+)"`, "i")) ??
      opfXml.match(new RegExp(`<item[^>]+href="([^"]+)"[^>]+id="${coverId}"`, "i"));

    if (itemMatch) {
      const entry = zip.getEntry(opfDir + itemMatch[1]);
      if (entry) {
        coverBuffer = entry.getData();
        coverExtension = itemMatch[1].slice(itemMatch[1].lastIndexOf("."));
      }
    }
  }

  // Fallback: item whose href contains "cover" and looks like an image
  if (!coverBuffer) {
    const fallback = opfXml.match(
      /<item[^>]+href="([^"]*cover[^"]*\.(jpg|jpeg|png|webp))"/i,
    );
    if (fallback) {
      const entry = zip.getEntry(opfDir + fallback[1]);
      if (entry) {
        coverBuffer = entry.getData();
        coverExtension = fallback[1].slice(fallback[1].lastIndexOf("."));
      }
    }
  }

  const pageCount = estimatePageCount(zip);

  return { title, author, description, coverBuffer, coverExtension, pageCount };
}
