"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type BookTile = {
  id: string;
  title: string;
  author: string;
  hasCover: boolean;
  isCurrentPick: boolean;
};

export type CatalogItem =
  | { type: "book"; book: BookTile }
  | { type: "series"; name: string; author: string; books: BookTile[] };

function Cover({ book }: { book: BookTile }) {
  return (
    <div className="aspect-[2/3] overflow-hidden rounded-lg border border-accent/10 bg-accent/5">
      {book.hasCover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/books/${book.id}/cover`}
          alt={book.title}
          className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
        />
      ) : (
        <div className="flex h-full items-center justify-center p-4 text-center text-xs text-ink/40">
          {book.title}
        </div>
      )}
    </div>
  );
}

function BookTileLink({ book, tabIndex }: { book: BookTile; tabIndex?: number }) {
  return (
    <Link href={`/books/${book.id}`} tabIndex={tabIndex} className="group block">
      <div className="mb-2">
        <Cover book={book} />
      </div>
      {book.isCurrentPick && (
        <span className="mb-1 inline-block rounded bg-accent/15 px-1.5 py-0.5 text-xs font-semibold text-accent-dark">
          Current pick
        </span>
      )}
      <p className="truncate text-sm font-semibold leading-snug">{book.title}</p>
      <p className="truncate text-xs text-ink/60">{book.author}</p>
    </Link>
  );
}

function SeriesStack({
  name,
  author,
  books,
  open,
  onToggle,
}: {
  name: string;
  author: string;
  books: BookTile[];
  open: boolean;
  onToggle: () => void;
}) {
  const front = books[0];
  const anyPick = books.some((b) => b.isCurrentPick);
  return (
    <button onClick={onToggle} className="group block w-full text-left" aria-expanded={open}>
      {/* Fanned-stack effect: two offset cards peek out behind the front cover. */}
      <div className="relative mb-2">
        <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-lg border border-accent/10 bg-accent/20" />
        <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-lg border border-accent/10 bg-accent/30" />
        <div className="relative">
          <Cover book={front} />
        </div>
        <span className="absolute bottom-2 right-2 z-10 rounded bg-ink/75 px-1.5 py-0.5 text-xs font-semibold text-paper">
          {books.length} books
        </span>
      </div>
      {anyPick && (
        <span className="mb-1 inline-block rounded bg-accent/15 px-1.5 py-0.5 text-xs font-semibold text-accent-dark">
          Current pick
        </span>
      )}
      <p className="truncate text-sm font-semibold leading-snug">
        {name} {open ? "▾" : "▸"}
      </p>
      <p className="truncate text-xs text-ink/60">{author}</p>
    </button>
  );
}

function SeriesPanel({
  name,
  books,
  open,
}: {
  name: string;
  books: BookTile[];
  open: boolean;
}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timer = setTimeout(() => setMounted(false), 300);
    return () => clearTimeout(timer);
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden={!visible}
      className={`col-span-full grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
        visible ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"
      }`}
    >
      {/* Full-width panel below the stack listing the volumes in order. */}
      <div className="overflow-hidden">
        <div className="rounded-lg bg-accent/5 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
            {name}
          </p>
          <ul className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            {books.map((b) => (
              <li key={b.id}>
                <BookTileLink book={b} tabIndex={visible ? 0 : -1} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function CatalogGrid({ items }: { items: CatalogItem[] }) {
  const [openSeries, setOpenSeries] = useState<Set<string>>(new Set());

  function toggle(name: string) {
    setOpenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3">
      {items.map((item) => {
        if (item.type === "book") {
          return (
            <li key={item.book.id}>
              <BookTileLink book={item.book} />
            </li>
          );
        }
        const open = openSeries.has(item.name);
        return (
          <li key={`series:${item.name}`} className="contents">
            <div>
              <SeriesStack
                name={item.name}
                author={item.author}
                books={item.books}
                open={open}
                onToggle={() => toggle(item.name)}
              />
            </div>
            <SeriesPanel name={item.name} books={item.books} open={open} />
          </li>
        );
      })}
    </ul>
  );
}
