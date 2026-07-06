import sharp from "sharp";

// Local spine-color extraction — no external API. Downsamples the cover and
// derives colors from pixel statistics:
//   bg     = dominant color (most-populated RGB bucket)
//   text   = cream or near-black, whichever contrasts with bg
//   accent = most common saturated color that reads differently from bg

export interface SpineColors {
  bg: string;
  text: string;
  accent: string;
}

const TEXT_LIGHT = "#f5e6c8";
const TEXT_DARK = "#2b2016";
const ACCENT_FALLBACK = "#c8923a";

interface Bucket {
  count: number;
  r: number;
  g: number;
  b: number;
}

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  if (max === 0) return 0;
  return (max - Math.min(r, g, b)) / max;
}

function distance(a: Bucket, b: Bucket): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

function hex(bucket: Bucket): string {
  const c = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${c(bucket.r)}${c(bucket.g)}${c(bucket.b)}`;
}

export async function extractSpineColors(cover: Buffer): Promise<SpineColors | null> {
  let data: Buffer;
  let channels: number;
  try {
    const raw = await sharp(cover)
      .resize(64, 64, { fit: "inside" })
      .raw()
      .toBuffer({ resolveWithObject: true });
    data = raw.data;
    channels = raw.info.channels;
  } catch {
    return null; // undecodable image — caller falls back to the default palette
  }

  // Quantize to a 32-per-channel grid and average each bucket's members so the
  // picked color is the bucket's true mean, not its grid corner.
  const buckets = new Map<number, Bucket>();
  for (let i = 0; i + 2 < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.count++;
      bucket.r += (r - bucket.r) / bucket.count;
      bucket.g += (g - bucket.g) / bucket.count;
      bucket.b += (b - bucket.b) / bucket.count;
    } else {
      buckets.set(key, { count: 1, r, g, b });
    }
  }
  if (buckets.size === 0) return null;

  const byCount = [...buckets.values()].sort((a, b) => b.count - a.count);
  const total = byCount.reduce((n, b) => n + b.count, 0);
  const bg = byCount[0];

  // Accent: the most common decently-saturated, decently-common color that is
  // visually distinct from the background.
  const accent = byCount.find(
    (b) =>
      b !== bg &&
      b.count / total >= 0.02 &&
      saturation(b.r, b.g, b.b) >= 0.3 &&
      distance(b, bg) >= 80,
  );

  return {
    bg: hex(bg),
    text: luminance(bg.r, bg.g, bg.b) < 150 ? TEXT_LIGHT : TEXT_DARK,
    accent: accent ? hex(accent) : ACCENT_FALLBACK,
  };
}
