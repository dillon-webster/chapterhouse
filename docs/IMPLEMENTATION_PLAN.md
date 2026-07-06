# Implementation Plan

Milestone-based roadmap for Chapterhouse.

## Status legend
- ✅ done
- 🚧 in progress
- ⬜ not started

---

## Platform targets (applies to all UI work)

**Phone-first.** The reading + social experience (catalog browse, reader, shelves,
feed, discussion, profiles) is used almost entirely on phones — added to the home
screen and launched like an app. Design these touch-first and small-viewport-first.

- Ship as a **PWA** so "Add to Home Screen" gives a full-screen, standalone,
  app-like launch: web app manifest (`display: standalone`, theme/background color,
  `start_url`), 192/512 icons, and iOS-specific `apple-touch-icon` +
  `apple-mobile-web-app-capable` meta (iOS ignores manifest icons). ✅ done —
  `src/app/manifest.ts`, generated book-glyph icons (`public/icon-{192,512}.png`
  + maskable, `app/icon.png`, `app/apple-icon.png`), `appleWebApp` + explicit
  `apple-mobile-web-app-capable` meta and `themeColor` viewport in `layout.tsx`.
  `manifest.webmanifest` excluded from the auth proxy so it's publicly fetchable.
- Offline reading (service worker caching the current EPUB) is a v2 nice-to-have.

**Desktop exception:** catalog management screens (delete, set pick) must also be
good on desktop. Books are added to the server directly by the server owner and
imported via `npm run db:import` or the in-app "Import books" button (admin only).

---

## Milestone 0 — Foundation ✅
- ✅ Next.js 16 + TypeScript + Tailwind project
- ✅ Prisma 7 schema for all models (User, Book, UserBook, ReadingSession,
  Comment, ActivityEvent, InviteCode) + enums
- ✅ Postgres via `pg` driver adapter; `prisma.config.ts` for the CLI
- ✅ Storage abstraction (`src/lib/storage.ts`) pointed at `STORAGE_DIR`
- ✅ Dockerfile + docker-compose (app + Postgres, external-drive bind mount)
- ✅ Seed script (admin user + invite code)

## Milestone 1 — Auth ✅
- ✅ NextAuth v5 Credentials provider, bcrypt, JWT sessions
- ✅ Invite-code signup API (`/api/signup`) + signup page
- ✅ Login page, sign-out, middleware route protection
- ✅ Session-aware nav shell with hamburger dropdown (`NavShell`, `NavMenu`)
- ⬜ Admin: rotate/deactivate invite codes (UI + API)

## Milestone 2 — Catalog ✅
- ✅ EPUBs added to server by owner; `npm run db:import` or in-app "Import books"
  button scans `STORAGE_DIR/epubs/`, extracts metadata + cover, creates DB rows
- ✅ `src/lib/epub.ts` — server-side EPUB parsing (adm-zip + OPF metadata + cover)
- ✅ Catalog browse grid (all users), book detail page
- ✅ Cover served via `/api/books/[id]/cover` (session-gated)
- ✅ Admin delete book (+ cascade cleanup of stored files)
- ✅ Flag/unflag current book-club pick

## Milestone 3 — Reader + progress ✅
- ✅ EPUB served via `/api/books/[id]/epub` (session-gated, ArrayBuffer to client)
- ✅ epub.js reader (`/books/[id]/read`); full-screen, no nav shell
- ✅ Persist CFI to `UserBook.currentLocation`; resumes on reopen
- ✅ Derive `progressPercent` from CFI; auto `CURRENTLY_READING` on first open.
  Builds + caches the epub.js locations index (localStorage) so `%` is non-zero
  (without it epub.js reports `percentage` as 0).
- ✅ Chapter breaks enforced via CSS column hook
- ✅ Tap zones (mobile) + arrow keys (desktop) for page turning
- ✅ Reading-session timer (visibility + 3-min idle) → `ReadingSession` rows.
  ReaderView accumulates active seconds, flushes every 30s + on hide/unmount
  (`sendBeacon`) to `POST /api/books/[id]/session`. Powers the profile "hours read".
- ✅ `FINISHED` near 100% — **confirmation prompt** (decided): at ~99% the reader
  shows "Mark this book as finished?"; confirm → `PATCH .../shelf` to FINISHED
  (emits the existing `SHELF_CHANGE` "finished" feed entry). Dismiss = "Not yet".

## Milestone 4 — Shelves ✅
- ✅ Add to shelf + status transitions API (`PATCH`/`DELETE`
  `/api/books/[id]/shelf`). Manages `startedAt`/`finishedAt`, sets 100% on
  FINISHED, no-ops on unchanged status. Shared labels/accents/empty-messages in
  `src/lib/shelf.ts`.
- ✅ Per-book `ShelfControls` (status picker + remove) on the book detail page.
- ✅ Emit `SHELF_CHANGE` activity events (`{from, to}` payload) on every
  transition; dashboard feed now renders them ("started reading", "finished", …).
- ✅ **Bookcase `/shelves` view** (`ShelfBookcase`) — a "real bookshelf" UI ported
  from the `book-shelf` companion app, re-themed to the paper/wood palette:
  - Hero **Currently Reading** card (cover + progress) above three wood
    **cabinets** (Want to read / Finished / DNF).
  - Books render as **spines standing on a shelf**; tap a spine → it enlarges,
    shows the **cover**, and a drawer slides out with title/author/%/details.
  - **Variable spine height** from `Book.pageCount` (estimated from EPUB text),
    giving the uneven real-bookcase silhouette. Empty cabinets show ghost spines
    + flavor text.

### Book spines (supports the bookcase)
- ✅ `Book.spineImageData` (base64 SVG) + `Book.pageCount` columns.
- ✅ `src/lib/spine.ts` composes the spine SVG; colors optionally derived from the
  cover via **Gemini** (`gemini-2.5-flash`, `GEMINI_API_KEY`), else a
  deterministic fallback palette — generation is best-effort, never blocks import.
- ✅ Page count estimated from EPUB text in `src/lib/epub.ts` (~1800 chars/page).
- ✅ Generated during `importBooks`; `npm run db:backfill-spines` backfills
  pre-existing books (`--force` to regenerate).

## Milestone 4.5 — Add any book (Open Library) ✅
Two coexisting lanes: the owner-supplied **EPUB catalog** stays the readable
library (`/catalog`, `source = EPUB`); **Open Library** lets users track any other
book on their shelves (metadata-only, no reader).
- ✅ Schema: `BookSource` enum, `Book.epubPath` now optional, `Book.coverUrl`
  (external), `Book.openLibraryId @unique` (dedupes shared shelf-only books).
- ✅ `src/lib/openLibrary.ts` (search.json) + `GET /api/search` (auth-gated).
- ✅ `POST /api/books/add` — upserts a shared `Book` by `openLibraryId`
  (`source = OPEN_LIBRARY`), creates the user's `UserBook`, emits `SHELF_CHANGE`,
  best-effort spine. `AddBookSearch` UI at `/shelves/add` (+ "Add book" on the
  bookcase header); pick the target shelf in the dropdown.
- ✅ Cover route redirects to `coverUrl` for OL books; spine color-extraction
  fetches remote covers. Catalog filters to EPUB; book detail hides **Read** and
  shows a "tracked from Open Library" note when there's no EPUB.
- ✅ **Synopsis**: search.json omits descriptions, so the add fetches the work
  record (`fetchOpenLibraryDescription`) and stores it; shown on book detail.
- ✅ **Merge / de-dupe** (`src/lib/bookMatch.ts`, normalized title+author): adding
  an OL book reuses a matching EPUB record, and importing an EPUB **upgrades** a
  matching OL row in place (`source → EPUB`, sets `epubPath`, regenerates spine) —
  preserving everyone's shelf entries instead of duplicating.
- ✅ "+ Add book" entry on both `/shelves` and `/catalog`; `BackButton` on book
  detail returns to wherever you came from.
- ✅ **Add page is two-tab** (`AddBookTabs`): **Club library** (search the EPUB
  catalog → add via shelf PATCH; `GET /api/catalog/search`, browse when empty) and
  **Open Library**, sharing one shelf-picker.

## Milestone 5 — Discussion
- ⬜ Per-book comment thread (flat + optional one-level reply)
- ⬜ Post/delete comment; surface current pick's discussion prominently
- ⬜ Emit `COMMENT` activity events (optional in feed)

## Milestone 6 — Activity feed 🚧
- ✅ Global feed **polling** (20s + on tab refocus): `GET /api/activity` JSON +
  client `ActivityFeed` (seeded with server data; `src/lib/activityFormat.ts`
  shared phrasing, `getRecentActivity` shared query in `src/lib/activity.ts`).
  Dashboard "Recent activity" now refreshes live instead of only on navigation.
- ✅ `MILESTONE` events: **started** + **halfway (50%)** emitted from the reader's
  progress save (`/api/books/[id]/progress`), de-duped on threshold crossing by
  reading prior progress. **Finished** is covered by the `SHELF_CHANGE` from the
  reader's finish confirmation (no separate milestone, to avoid double entries).
- ✅ Feed rendering for `SHELF_CHANGE` / `MILESTONE` (started, halfway, finished).
- ⬜ Dedicated full feed page (currently only the dashboard's recent-15 slice).
- ⬜ `COMMENT` event rendering (needs M5 discussion).

## Milestone 7 — Profiles ✅
- ✅ Profile page: currently reading + live %, shelf counts, recent activity.
  `getProfileData` (`src/lib/profile.ts`) + `ProfileView`. Own profile at
  `/profile`; others at `/u/[username]` (self redirects to `/profile`).
- ✅ Stats: books finished this year, total hours read (sum `ReadingSession`,
  `formatReadingTime`), total on shelves.
- ✅ Avatar upload + bio + display-name edit (`ProfileEditor` → `PATCH /api/profile`
  multipart, `saveFile("avatars")`); `Avatar` component w/ initials fallback,
  served via `GET /api/users/[id]/avatar`.
- ✅ **Members directory** `/members` (nav item) + clickable feed names →
  `/u/[username]`.

## Milestone 8 — Beta logs / observability ⬜
- ⬜ Structured server logging for beta debugging: request method/path/status,
  authenticated user id/username when available, duration, and a stable request id.
  Logs should omit secrets, passwords, invite codes, raw EPUB contents, and auth
  tokens.
- ⬜ Log important product events with enough context to diagnose beta issues:
  signup/login failures, book import results, Open Library add failures, shelf
  changes, reader progress/session save failures, profile/avatar update failures,
  and admin actions (import/delete/current-pick).
- ⬜ Persist app logs somewhere durable on the host (for example a `logs/`
  directory next to `STORAGE_DIR`, mounted into the container) in addition to Docker
  stdout, so logs survive container rebuilds and can be inspected without relying
  only on `docker compose logs`.
- ⬜ Admin-only logs page or download endpoint: filter by level/time/user/action,
  show recent errors first, and make it easy to copy a trace/request id while
  beta testers report problems.
- ⬜ Add basic operational docs: where logs live on the server, how to tail them,
  how long they are retained, and what data must never be logged.

## Milestone 9 — Public self-hosted release ⬜

Open-source the app so anyone can run their own instance for their own group
(the Jellyfin/Audiobookshelf model). **One instance = one club**, so no
multi-tenancy is needed — the invite-code gate and single shared feed stay
as-is. Books remain the instance owner's responsibility, exactly like today.

What has to change from the current setup:

- ⬜ **First-run setup wizard** (replaces `db:seed` + `SEED_*` env vars): on
  first launch with zero users, the browser shows a "create your admin account"
  page that also generates the initial invite code. The seed script stays as a
  dev/CI convenience only.
- ⬜ **Config diet**: reduce required env vars to `POSTGRES_PASSWORD` + storage
  path. Auto-generate `AUTH_SECRET` on first boot and persist it under
  `STORAGE_DIR`. Everything else defaults sensibly (`GEMINI_API_KEY` already
  follows the right pattern: optional, best-effort, silent fallback).
- ⬜ **Invite-code admin UI** (the open Milestone 1 item) becomes required —
  rotate/deactivate codes in-app; instance owners won't have a Prisma escape
  hatch. This is how an owner controls who joins.
- ⬜ **Reverse-proxy support + docs**: verify Auth.js works behind
  Traefik/Nginx Proxy Manager/Tailscale with TLS termination (`AUTH_URL`,
  trusted-host/proxy headers). Document the canonical proxy setups — this is
  the #1 issue source for self-hosted apps (we already hit the LAN-IP flavor
  of it with phone sign-in).
- ⬜ **Published multi-arch Docker image** (amd64 + arm64 for Pi/NAS users) on
  GHCR with tagged releases, so `docker compose up` works with no local build.
  Auto-migrate-on-startup already works; keep it.
- ⬜ **Public README + docs**: written for strangers — screenshots (lead with
  the bookcase view), feature list, copy-paste compose file, upgrade
  instructions, backup guidance (Postgres dump + `STORAGE_DIR`).
- ⬜ **License + name**: pick a license (AGPL to prevent paid hosted forks, MIT
  if we don't care) and a searchable project name ("Book Club" is ungoogleable).
- ⬜ **Basic hardening for strangers' instances**: rate-limit login/signup,
  and land enough of Milestone 8 (error logging) that issue reports are
  diagnosable.

Explicitly **out of scope**: multi-tenancy/club entities, email/SMTP (invite
codes make it unnecessary), and external auth providers (OIDC is a common
request but a later maybe). One-club-per-instance simplicity is the product.

Suggested sequencing: finish M5 (discussion) so the app feels complete, then
setup wizard → invite UI → published image → README, and it's launchable.

---

## Open questions (carried from the brief)
1. **Comment threading**: flat-only for v1, or one level of replies?
   Schema supports one level via `Comment.parentCommentId`.
2. ~~**Finished trigger**: auto vs. confirmation?~~ **Resolved:** confirmation
   prompt at ~99% in the reader (see Milestone 3).
3. **Storage**: confirmed — local disk on the host, bind-mounted into the
   container at `/data`.
