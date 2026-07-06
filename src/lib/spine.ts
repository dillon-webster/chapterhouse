import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";

// Builds a small SVG "book spine" for the Shelves bookcase. Colors are optionally
// derived from the cover via Gemini; without a GEMINI_API_KEY we fall back to a
// deterministic library palette so every book still gets a spine.

interface SpineColors {
  bg: string;
  text: string;
  accent: string;
}

const DEFAULTS: SpineColors = { bg: "#3a1e0a", text: "#f5e6c8", accent: "#c8923a" };

// Deterministic fallback palette keyed off the book id, so spines vary even
// when Gemini isn't configured.
const FALLBACK_BGS = [
  "#5c2d1e",
  "#1e3a5c",
  "#1e5c3a",
  "#5c1e3a",
  "#3a2d1e",
  "#2d1e5c",
  "#5c3a1e",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function fallbackColors(bookId: string): SpineColors {
  return { ...DEFAULTS, bg: FALLBACK_BGS[hashString(bookId) % FALLBACK_BGS.length] };
}

async function extractColors(
  coverData: Buffer,
  mimeType: string,
  ai: GoogleGenAI,
): Promise<SpineColors> {
  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: 'Analyze this book cover and return ONLY a JSON object, no explanation: {"bg":"#xxxxxx","text":"#xxxxxx","accent":"#xxxxxx"} — bg is the dominant spine/background color, text is a high-contrast color for reading on bg (usually white or cream for dark bg, dark for light bg), accent is the most prominent decorative color (gold, silver, etc). Return only valid JSON.',
          },
          { inlineData: { mimeType, data: coverData.toString("base64") } },
        ],
      },
    ],
  });

  const raw = result.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text ?? "";
  const match = raw.match(/\{[^}]+\}/);
  if (!match) return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(match[0]) } as SpineColors;
  } catch {
    return DEFAULTS;
  }
}

function spineTitle(title: string): string {
  return title.replace(/\s*\([^)]*\)/g, "").replace(/\s*:.+$/, "").trim();
}

function wrapSpineTitle(title: string): string[] {
  const words = title.split(" ");
  if (title.length <= 12) return [title];

  const maxPerLine = 13;
  const lines: string[] = [];
  let current = "";

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const candidate = current ? `${current} ${word}` : word;
    if (current && candidate.length > maxPerLine) {
      lines.push(current);
      if (lines.length === 2) {
        lines.push(words.slice(i).join(" "));
        return lines;
      }
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function buildSpineSVG(rawTitle: string, c: SpineColors): string {
  const title = spineTitle(rawTitle);
  const W = 60;
  const H = 300;

  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const lines = wrapSpineTitle(title.toUpperCase());
  const fontSize = 11;
  const lineHeight = 14;
  const startY = -((lines.length - 1) * lineHeight) / 2;
  const textEls = lines
    .map(
      (line, i) =>
        `<text text-anchor="middle" dominant-baseline="central" y="${startY + i * lineHeight}" font-family="Georgia,'Times New Roman',serif" font-size="${fontSize}" font-weight="bold" fill="${c.text}" letter-spacing="1">${esc(line)}</text>`,
    )
    .join("\n    ");

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="t" width="4" height="4" patternUnits="userSpaceOnUse">
      <path d="M0,4 L4,0" stroke="#000" stroke-width="0.6" opacity="0.08"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="${c.bg}"/>
  <rect width="${W}" height="${H}" fill="url(#t)"/>
  <rect width="${W}" height="7" fill="${c.accent}" opacity="0.65"/>
  <rect y="7" width="${W}" height="1" fill="${c.text}" opacity="0.15"/>
  <rect y="${H - 8}" width="${W}" height="1" fill="${c.text}" opacity="0.15"/>
  <rect y="${H - 7}" width="${W}" height="7" fill="${c.accent}" opacity="0.65"/>
  <g transform="translate(${W / 2},${H / 2}) rotate(-90)">
    ${textEls}
  </g>
  <text x="${W / 2}" y="${H - 18}" text-anchor="middle" font-family="Georgia,serif" font-size="9" fill="${c.accent}" opacity="0.85">◆</text>
</svg>`;
}

function mimeFromName(name: string): string {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

// Cover bytes for color extraction — from a local file (EPUB imports) or a
// remote URL (Open Library books).
async function loadCover(
  coverPath: string | null,
  coverUrl: string | null,
): Promise<{ data: Buffer; mimeType: string } | null> {
  if (coverPath) {
    return { data: await readStoredFile("covers", coverPath), mimeType: mimeFromName(coverPath) };
  }
  if (coverUrl) {
    const res = await fetch(coverUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = Buffer.from(await res.arrayBuffer());
    const mimeType = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    return { data, mimeType };
  }
  return null;
}

/**
 * Generate (and persist) a spine SVG for a book. Best-effort: derives colors
 * from the cover via Gemini when configured, otherwise uses a deterministic
 * fallback palette. Skips books that already have a spine unless `force`.
 */
export async function generateSpine(bookId: string, force = false): Promise<void> {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book || (book.spineImageData && !force)) return;

  let colors = fallbackColors(bookId);

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const cover = await loadCover(book.coverPath, book.coverUrl);
      if (cover) {
        const ai = new GoogleGenAI({ apiKey });
        colors = await extractColors(cover.data, cover.mimeType, ai);
      }
    } catch (e) {
      console.error(`[spine] color extraction failed for ${bookId}:`, e);
    }
  }

  try {
    const svg = buildSpineSVG(book.title, colors);
    const spineImageData = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    await prisma.book.update({ where: { id: bookId }, data: { spineImageData } });
  } catch (e) {
    console.error(`[spine] build failed for ${bookId}:`, e);
  }
}
