# Audiobook Support — Implementation Plan

Checklist for adding audiobooks to Chapterhouse. Planned 2026-07-13; see
`IMPLEMENTATION_PLAN.md` for the overall roadmap and status legend.

**Design stance:** audio is an *additional format on a Book*, not a new kind of
book. A book can have an EPUB, an audiobook, or both; shelves, comments, picks,
activity, and sessions stay unified per book. V1 accepts **single-file M4B or
MP3 only** — folder-of-MP3s sources (Libro.fm, LibriVox, CD rips) get merged
first with `m4b-tool`/ffmpeg (document the one-liner).

**Deliberately not in v1:** folder-of-MP3s books, EPUB↔audio position sync
(Whispersync), transcoding, offline/downloaded playback in the PWA.

---

## Phase 1 — Foundation (schema, storage, streaming)

- [ ] Migration: add to `Book` — `audioPath String?` (relative path under
      `STORAGE_DIR/audiobooks`), `audioDurationSeconds Int?` (drives progress %),
      `audioMimeType String?` (`audio/mp4` for m4b, `audio/mpeg` for mp3)
- [ ] Migration: add to `UserBook` — `audioPositionSeconds Float @default(0)`
      (player resume point). `progressPercent` stays the single source of truth
      for shelves/milestones; whichever format was last used writes it. No
      `BookSource` enum change — "has audio" is derived from `audioPath`.
- [ ] `src/lib/storage.ts`: add `AUDIOBOOK_DIR = STORAGE_DIR/audiobooks` to
      `SUBDIRS` (ensure/resolve/save/delete come for free)
- [ ] `src/lib/storage.ts`: add stream-based helpers (`statStoredFile`,
      `openStoredStream`) — the audio route must not use `readStoredFile`
      (whole-buffer) for multi-hundred-MB files
- [ ] `GET /api/books/[id]/audio` — session-gated, **Range-aware** streaming
      route (mirrors `epub/route.ts` auth shape):
      - [ ] `Range` header → `206` + `Content-Range` + `Accept-Ranges: bytes`,
            body via `fs.createReadStream(path, { start, end })`
      - [ ] No range → `200` full stream; malformed/unsatisfiable → `416`
      - [ ] Same `private` cache headers as the EPUB route
      - [ ] Verify with `curl -H "Range: bytes=0-1023"` (206) and no header (200)
- [ ] Real-device check: `<audio src>` requests from the installed PWA carry the
      session cookie (same-origin should, but the whole app is behind auth)

## Phase 2 — Import pipeline

- [ ] `src/lib/audioMeta.ts`: extract title, author/artist, duration, embedded
      cover, and M4B chapter markers using `music-metadata` (pure JS — no ffmpeg
      in the Docker image). Mirrors what `epub.ts` does for EPUBs.
- [ ] `importBooks.ts`: scan `storage/audiobooks/` for `.m4b`/`.mp3` alongside
      the EPUB scan (same skip-already-imported logic keyed on `audioPath`)
- [ ] Reuse `findMatchingBook(title, author)` so audio **attaches to the
      existing Book** when the club already has the EPUB (same pattern as the
      Open Library upgrade path) instead of creating a duplicate
- [ ] Audio-only books: create Book with cover from embedded art; reuse
      spine generation
- [ ] `npm run db:import` (prisma/import.ts) picks up the audio scan too

## Phase 3 — Player + progress

- [ ] `PATCH /api/books/[id]/progress`: extend zod schema to a union —
      `{ cfi, progress }` (reader) or `{ positionSeconds, progress }` (player);
      `buildProgressUpdate` gets optional `audioPositionSeconds`. Existing
      milestone logic (started / halfway guards) then works for listening
      unchanged.
- [ ] Player page `(reader)/books/[id]/listen` (sibling of `/read`, no nav
      shell): native `<audio>` element, no library
      - [ ] Controls: play/pause, ±30s skip, scrub bar, playback speed (0.8–2×)
      - [ ] Chapter list from M4B markers (skip for MP3s without chapters)
      - [ ] Sleep timer
      - [ ] Resume from `audioPositionSeconds`; save position debounced
            (~every 15–30s and on pause), same pattern as the reader's CFI saves
- [ ] Media Session API: lock-screen controls + artwork. **Test screen-lock
      playback on iOS (installed PWA) early — riskiest unknown in the plan.**
- [ ] Listening time: call the existing `POST /api/books/[id]/session` endpoint
      from the player (same flush pattern as ReaderView). `ReadingSession`
      needs no schema change; stats become "time with the book."
- [ ] "Mark as finished?" prompt near the end, matching the reader's behavior

## Phase 4 — Surfaces & polish

- [ ] Book detail page: "Listen" button next to "Read" when `audioPath` is set
- [ ] Catalog/shelf cards: small headphones badge for books with audio
- [ ] Admin upload: accept `.m4b`/`.mp3` in the upload route + UI, with a size
      cap (~300 MB — `request.formData()` buffers the whole body); UI points at
      the folder-drop flow for bigger files. Check Next's body-size limit.
- [ ] Activity feed (optional): milestone payload gains `medium: "audio"` so
      the feed can say "started listening to"
- [ ] README: update "what it doesn't do" section + the Kavita/Calibre-Web
      comparison (neither really does audiobooks; Audiobookshelf is the
      library-shaped tool, Chapterhouse is the club-shaped one); document the
      `m4b-tool`/ffmpeg merge command for folder-of-MP3s purchases
- [ ] `docs/IMPLEMENTATION_PLAN.md`: add audiobooks milestone pointing here

## Suggested order

1. Phase 1 (foundation — testable with curl before any UI exists)
2. Phase 2 (import — catalog shows audio books end-to-end)
3. Phase 3 (player — biggest chunk; mostly UI polish + iOS testing)
4. Phase 4 (small touches)

Nothing touches existing reader behavior: with no audio files present, the app
behaves exactly as today.
