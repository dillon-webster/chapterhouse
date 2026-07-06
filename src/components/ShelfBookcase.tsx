"use client";

import { useState } from "react";
import Link from "next/link";

export type ShelfEntry = {
  entryId: string;
  bookId: string;
  title: string;
  author: string;
  hasCover: boolean;
  spineImageData: string | null;
  progressPercent: number;
  pageCount: number | null;
};

export type ShelfData = {
  status: string;
  label: string;
  accentColor: string;
  emptyMessage: string;
  entries: ShelfEntry[];
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const SPINE_COLORS = [
  "#5c2d1e",
  "#1e3a5c",
  "#1e5c3a",
  "#5c1e3a",
  "#3a2d1e",
  "#2d1e5c",
  "#5c3a1e",
];

function spineColor(bookId: string): string {
  return SPINE_COLORS[hashString(bookId) % SPINE_COLORS.length];
}

// Spine height scales with the book's estimated length, so a packed shelf has
// the uneven, real-bookcase silhouette.
function spineHeight(pageCount: number | null): number {
  if (!pageCount) return 100;
  return Math.round(Math.min(140, Math.max(78, 78 + (pageCount / 600) * 62)));
}

function coverUrl(bookId: string): string {
  return `/api/books/${bookId}/cover`;
}

function pct(entry: ShelfEntry): number | null {
  return entry.progressPercent > 0 ? Math.min(100, Math.round(entry.progressPercent)) : null;
}

// ─── ghost spines (empty shelf) ───────────────────────────────────────────────

function GhostSpines() {
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", padding: "0 12px" }}>
      {[90, 104, 88, 96, 100].map((h, i) => (
        <div
          key={i}
          style={{
            width: "28px",
            height: `${h}px`,
            borderRadius: "2px 2px 0 0",
            background: "var(--wood-ghost-bg)",
            border: "1px solid var(--wood-ghost-border)",
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

// ─── one book spine (collapses to a spine, expands to show the cover) ─────────

function BookSpine({
  entry,
  isSelected,
  accentColor,
  onClick,
}: {
  entry: ShelfEntry;
  isSelected: boolean;
  accentColor: string;
  onClick: () => void;
}) {
  const bg = spineColor(entry.bookId);
  const h = spineHeight(entry.pageCount);

  if (isSelected) {
    return (
      <button
        onClick={onClick}
        title={entry.title}
        style={{
          width: "78px",
          height: `${Math.round(h * 1.2)}px`,
          borderRadius: "3px 3px 0 0",
          border: `2px solid ${accentColor}`,
          boxShadow: `0 0 12px ${accentColor}55, 0 8px 18px rgba(60,40,20,0.35)`,
          transform: "translateY(-14px)",
          transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
          cursor: "pointer",
          flexShrink: 0,
          overflow: "hidden",
          background: bg,
          position: "relative",
          padding: 0,
        }}
      >
        {entry.hasCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            src={coverUrl(entry.bookId)}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block" }}
          />
        ) : entry.spineImageData ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" src={entry.spineImageData} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <SpineLabel title={entry.title} size={9} />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      title={entry.title}
      style={{
        width: "32px",
        height: `${h}px`,
        borderRadius: "2px 2px 0 0",
        border: "1px solid rgba(40,25,10,0.18)",
        transition: "transform 0.2s ease",
        cursor: "pointer",
        flexShrink: 0,
        overflow: "hidden",
        background: bg,
        position: "relative",
        padding: 0,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-4px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
      }}
    >
      {entry.spineImageData ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          src={entry.spineImageData}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }}
        />
      ) : (
        <SpineLabel title={entry.title} size={8} />
      )}
    </button>
  );
}

function SpineLabel({ title, size }: { title: string; size: number }) {
  return (
    <span
      style={{
        writingMode: "vertical-rl",
        transform: "rotate(180deg)",
        fontSize: `${size}px`,
        color: "rgba(255,255,255,0.7)",
        padding: "5px 3px",
        display: "block",
        overflow: "hidden",
        maxHeight: "100%",
        lineHeight: 1.2,
        fontFamily: "Georgia, serif",
      }}
    >
      {title}
    </span>
  );
}

// ─── drawer that slides out below the shelf ───────────────────────────────────

function BookDrawer({ entry, accentColor }: { entry: ShelfEntry; accentColor: string }) {
  const p = pct(entry);
  return (
    <div style={{ overflow: "hidden", maxHeight: "240px", transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)" }}>
      <div style={{ borderTop: `2px solid ${accentColor}55`, background: "var(--wood-drawer)", padding: "14px 16px 16px" }}>
        <p style={{ fontFamily: "Georgia, serif", fontSize: "1.05rem", fontWeight: 600, color: "var(--shelf-text)", margin: 0, lineHeight: 1.3 }}>
          {entry.title}
        </p>
        {entry.author && <p style={{ fontSize: "0.75rem", color: "var(--shelf-muted)", margin: "3px 0 0" }}>{entry.author}</p>}

        <p style={{ fontSize: "0.65rem", color: `${accentColor}aa`, margin: "8px 0", letterSpacing: "0.1em", textAlign: "center" }}>
          ◆ ─── ◆
        </p>

        {p !== null ? (
          <>
            <p style={{ fontSize: "0.7rem", color: "var(--shelf-muted)", margin: "0 0 5px" }}>{p}%</p>
            <div style={{ height: "4px", background: "var(--wood-track)", borderRadius: "2px", overflow: "hidden", marginBottom: "12px" }}>
              <div style={{ height: "100%", width: `${p}%`, background: accentColor, borderRadius: "2px", transition: "width 0.5s ease" }} />
            </div>
          </>
        ) : (
          <div style={{ marginBottom: "12px" }} />
        )}

        <Link
          href={`/books/${entry.bookId}`}
          style={{
            display: "inline-block",
            fontSize: "0.7rem",
            fontWeight: 600,
            color: accentColor,
            border: `1px solid ${accentColor}66`,
            borderRadius: "4px",
            padding: "4px 10px",
            letterSpacing: "0.04em",
          }}
        >
          View details &rarr;
        </Link>
      </div>
    </div>
  );
}

// ─── one cabinet (a single shelf status) ──────────────────────────────────────

function Cabinet({
  shelf,
  selectedEntryId,
  onSelect,
}: {
  shelf: ShelfData;
  selectedEntryId: string | undefined;
  onSelect: (entryId: string | undefined) => void;
}) {
  const { accentColor, label, entries, emptyMessage } = shelf;
  const selectedEntry = entries.find((e) => e.entryId === selectedEntryId) ?? null;

  return (
    <div
      style={{
        background: "linear-gradient(175deg, var(--wood-cabinet-1) 0%, var(--wood-cabinet-2) 55%, var(--wood-cabinet-3) 100%)",
        border: "2px solid var(--wood-edge)",
        borderRadius: "12px 12px 6px 6px",
        boxShadow: "inset 0 1px 0 var(--wood-inset), 0 6px 20px rgba(60,40,20,0.18)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Nameplate */}
      <div style={{ padding: "10px 14px 8px", textAlign: "center", background: `${accentColor}1a`, borderBottom: `1px solid ${accentColor}44` }}>
        <p
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "0.85rem",
            fontWeight: 700,
            color: accentColor,
            margin: 0,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </p>
        <p style={{ fontSize: "0.65rem", color: `${accentColor}cc`, margin: "2px 0 0" }}>
          {entries.length} {entries.length === 1 ? "book" : "books"}
        </p>
      </div>

      {/* Shelf zone */}
      <div
        style={{
          minHeight: "200px",
          background: "linear-gradient(to bottom, var(--wood-shelf-1) 0%, var(--wood-shelf-2) 60%, var(--wood-shelf-3) 100%)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", flexWrap: "wrap", gap: "6px", padding: "12px 12px 0", minHeight: "150px" }}>
          {entries.length === 0 ? (
            <GhostSpines />
          ) : (
            entries.map((entry) => (
              <BookSpine
                key={entry.entryId}
                entry={entry}
                isSelected={entry.entryId === selectedEntryId}
                accentColor={accentColor}
                onClick={() => onSelect(entry.entryId === selectedEntryId ? undefined : entry.entryId)}
              />
            ))
          )}
        </div>

        {entries.length === 0 && (
          <p
            style={{
              fontSize: "0.7rem",
              color: `${accentColor}99`,
              textAlign: "center",
              padding: "6px 12px 4px",
              whiteSpace: "pre-line",
              fontStyle: "italic",
              margin: 0,
            }}
          >
            {emptyMessage}
          </p>
        )}

        {/* Shelf surface strip */}
        <div
          style={{
            height: "14px",
            background: "linear-gradient(to bottom, var(--wood-rail-1) 0%, var(--wood-rail-2) 55%, var(--wood-rail-3) 100%)",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.25)",
            flexShrink: 0,
          }}
        />
      </div>

      {selectedEntry && <BookDrawer entry={selectedEntry} accentColor={accentColor} />}
    </div>
  );
}

// ─── currently-reading hero card ──────────────────────────────────────────────

function CurrentlyReadingCard({ shelf }: { shelf: ShelfData }) {
  const { accentColor, entries, emptyMessage } = shelf;
  const book = entries[0] ?? null;

  const base: React.CSSProperties = {
    background: "linear-gradient(175deg, var(--wood-card-1) 0%, var(--wood-card-2) 100%)",
    border: `2px solid `,
    borderRadius: "10px",
    boxShadow: book
      ? `inset 0 1px 0 var(--wood-inset), 0 0 18px ${accentColor}1f, 0 6px 20px rgba(60,40,20,0.18)`
      : "inset 0 1px 0 var(--wood-inset)",
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
  };

  if (!book) {
    return (
      <div style={base}>
        <div style={{ width: "52px", height: "76px", borderRadius: "3px", background: "var(--wood-ghost-bg)", border: "1px solid var(--wood-ghost-border)", flexShrink: 0 }} />
        <p style={{ fontSize: "0.8rem", color: "var(--shelf-muted)", fontStyle: "italic", margin: 0 }}>{emptyMessage}</p>
      </div>
    );
  }

  const p = pct(book);
  return (
    <div style={base}>
      <div style={{ width: "52px", height: "76px", borderRadius: "3px", overflow: "hidden", flexShrink: 0, background: spineColor(book.bookId), border: `1px solid ${accentColor}44` }}>
        {book.hasCover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" src={coverUrl(book.bookId)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block" }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "Georgia, serif", fontSize: "1rem", fontWeight: 600, color: "var(--shelf-text)", margin: 0, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {book.title}
        </p>
        {book.author && <p style={{ fontSize: "0.72rem", color: "var(--shelf-muted)", margin: "2px 0 8px" }}>{book.author}</p>}

        {p !== null && (
          <>
            <p style={{ fontSize: "0.68rem", color: "var(--shelf-muted)", margin: "0 0 4px" }}>{p}%</p>
            <div style={{ height: "3px", background: "var(--wood-track)", borderRadius: "2px", overflow: "hidden", marginBottom: "10px" }}>
              <div style={{ height: "100%", width: `${p}%`, background: accentColor, borderRadius: "2px" }} />
            </div>
          </>
        )}

        <Link
          href={`/books/${book.bookId}`}
          style={{ display: "inline-block", fontSize: "0.68rem", fontWeight: 600, color: accentColor, border: `1px solid ${accentColor}66`, borderRadius: "4px", padding: "3px 8px", letterSpacing: "0.04em" }}
        >
          View details &rarr;
        </Link>
      </div>
    </div>
  );
}

// ─── root ─────────────────────────────────────────────────────────────────────

export function ShelfBookcase({ shelves, totalBooks }: { shelves: ShelfData[]; totalBooks: number }) {
  const [selected, setSelected] = useState<Record<string, string | undefined>>({});

  const readingShelf = shelves.find((s) => s.status === "CURRENTLY_READING");
  const otherShelves = shelves.filter((s) => s.status !== "CURRENTLY_READING");

  return (
    <div>
      <section style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "12px", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.875rem", fontWeight: 700, lineHeight: 1.2, margin: 0, color: "rgb(var(--accent))" }}>Shelves</h1>
          <p style={{ marginTop: "4px", fontSize: "0.875rem", color: "var(--shelf-muted)" }}>Your reading, arranged on the shelf.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--shelf-muted)", margin: 0 }}>
            {totalBooks} {totalBooks === 1 ? "book" : "books"} tracked
          </p>
          <Link
            href="/shelves/add"
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "#faf8f3",
              background: "rgb(var(--accent-dark))",
              borderRadius: "8px",
              padding: "7px 12px",
              whiteSpace: "nowrap",
            }}
          >
            + Add book
          </Link>
        </div>
      </section>

      {readingShelf && (
        <div style={{ marginBottom: "26px" }}>
          <p style={{ fontFamily: "Georgia, serif", fontSize: "0.75rem", fontWeight: 700, color: readingShelf.accentColor, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 8px" }}>
            Currently Reading
          </p>
          <CurrentlyReadingCard shelf={readingShelf} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
        {otherShelves.map((shelf) => (
          <Cabinet
            key={shelf.status}
            shelf={shelf}
            selectedEntryId={selected[shelf.status]}
            onSelect={(entryId) => setSelected((prev) => ({ ...prev, [shelf.status]: entryId }))}
          />
        ))}
      </div>
    </div>
  );
}
