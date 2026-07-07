// Series helpers, kept dependency-free so both API routes and the manage UI can
// share them and the parsing rules can be unit-tested.

export interface SeriesFields {
  series: string | null;
  seriesIndex: number | null;
}

// A parsed suggestion always names a series (or the parse returns null).
export interface SeriesGuess {
  series: string;
  seriesIndex: number | null;
}

// Canonicalize admin-supplied series input the same way everywhere: trim the
// name, treat empty as "no series", coerce the index to a finite number or
// null, and — when the series is cleared — drop the index so no stale order
// lingers. Mirrors the single-book PATCH so bulk and per-book edits agree.
export function normalizeSeries(
  seriesRaw: unknown,
  indexRaw: unknown,
): SeriesFields {
  const series =
    typeof seriesRaw === "string" && seriesRaw.trim().length > 0
      ? seriesRaw.trim()
      : null;

  if (series === null) return { series: null, seriesIndex: null };

  const n = Number(indexRaw);
  const seriesIndex = indexRaw === null || indexRaw === "" || !Number.isFinite(n) ? null : n;
  return { series, seriesIndex };
}

// Words that mark a parenthetical as an edition/format note rather than a
// series (unless it also carries an explicit "Book N").
const NON_SERIES = /\b(edition|anniversary|unabridged|abridged|omnibus|box(?:ed)? set)\b/i;
// A number introduced by a "book"-like word, e.g. "Book 2", "#3", "Vol. 4".
const BOOK_NUM = /\b(?:book|bk|#|vol\.?|volume)\s*(\d+(?:\.\d+)?)/i;
// A bare number at the very end, e.g. "Ranger's Apprentice 4".
const TRAILING_NUM = /\s(\d+(?:\.\d+)?)$/;

/**
 * Best-effort guess of a book's series + index from patterns embedded in its
 * title, e.g. "Die Trying (Jack Reacher, Book 2)" or
 * "Red Rising (Red Rising Series Book 1)". Returns null when nothing looks like
 * a series — this only ever *suggests*; an admin reviews every result.
 */
export function parseSeriesFromTitle(title: string): SeriesGuess | null {
  const groups = [...title.matchAll(/\(([^)]+)\)/g)].map((m) => m[1].trim());

  // Prefer the last parenthetical — series/volume notes trail the title.
  for (const raw of groups.reverse()) {
    let seriesIndex: number | null = null;
    const bookNum = raw.match(BOOK_NUM);
    if (bookNum) {
      seriesIndex = parseFloat(bookNum[1]);
    } else {
      const trailing = raw.match(TRAILING_NUM);
      if (trailing) seriesIndex = parseFloat(trailing[1]);
    }

    // Only treat it as a series if it names one (Saga/Trilogy/…) or carries a
    // volume number; otherwise it's likely a subtitle or format note.
    const looksLikeSeries =
      seriesIndex !== null || /\b(series|saga|trilogy|chronicles|cycle)\b/i.test(raw);
    if (!looksLikeSeries) continue;
    if (seriesIndex === null && NON_SERIES.test(raw)) continue;

    const series = raw
      .replace(BOOK_NUM, "") // drop "Book 2"
      .replace(TRAILING_NUM, "") // drop a trailing bare number
      .replace(/[,\s]+$/, "") // trailing comma/space left behind
      .replace(/^the\s+/i, "") // leading article
      .replace(/\s+series$/i, "") // "Red Rising Series" -> "Red Rising"
      .replace(/[,\s]+$/, "")
      .trim();

    if (series.length < 2) continue;
    return { series, seriesIndex };
  }

  return null;
}
