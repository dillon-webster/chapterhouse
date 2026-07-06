// Open Library search — lets users add any book (metadata + cover) to a shelf
// even when it isn't in the club's uploaded-EPUB catalog.

export type BookSearchResult = {
  openLibraryId: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  pageCount: number | null;
};

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  number_of_pages_median?: number;
};

type OpenLibrarySearchResponse = {
  docs?: OpenLibraryDoc[];
};

export function normalizeOpenLibrarySearch(
  payload: OpenLibrarySearchResponse,
): BookSearchResult[] {
  return (payload.docs ?? [])
    .filter((doc) => doc.key && doc.title)
    .slice(0, 12)
    .map((doc) => ({
      // doc.key looks like "/works/OL12345W" — keep the trailing id.
      openLibraryId: doc.key?.split("/").pop() ?? doc.key ?? "",
      title: doc.title ?? "Untitled",
      author: doc.author_name?.[0] ?? null,
      coverUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
        : null,
      pageCount: doc.number_of_pages_median ?? null,
    }));
}

// search.json omits descriptions; fetch the work record for the synopsis.
export async function fetchOpenLibraryDescription(
  openLibraryId: string,
): Promise<string | null> {
  try {
    const res = await fetch(`https://openlibrary.org/works/${openLibraryId}.json`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { description?: string | { value?: string } };
    const desc = typeof data.description === "string" ? data.description : data.description?.value;
    return desc?.trim() || null;
  } catch {
    return null;
  }
}

export async function searchOpenLibrary(query: string): Promise<BookSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    fields: "key,title,author_name,cover_i,number_of_pages_median",
    limit: "12",
  });

  let response: Response;
  try {
    response = await fetch(`https://openlibrary.org/search.json?${params}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw new Error("Open Library search failed");
  }

  if (!response.ok) throw new Error("Open Library search failed");

  return normalizeOpenLibrarySearch(await response.json());
}
