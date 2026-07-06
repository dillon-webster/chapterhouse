# Chapterhouse

A self-hosted, private social reading app for you and your friends — a book
club in a box. In-app EPUB reader with automatic progress tracking, a shared
catalog, a monthly book-club pick, bookcase-style shelves, and a group
activity feed. One instance hosts one club.

Each instance is private: members join by invite code, and books are EPUB
files the instance owner supplies.

<p align="center">
  <img src="docs/screenshots/bookcase-shelves.png" width="24%" alt="Bookcase shelves with book spines" />
  <img src="docs/screenshots/reader.png" width="24%" alt="EPUB reader" />
  <img src="docs/screenshots/dashboard.png" width="24%" alt="Dashboard with the club's current pick" />
  <img src="docs/screenshots/catalog.jpg" width="24%" alt="Shared catalog" />
</p>

## Quick start (Docker)

All you need is Docker. No account creation, no config files, no secrets to
generate:

```bash
mkdir chapterhouse && cd chapterhouse
curl -LO https://raw.githubusercontent.com/dillon-webster/chapterhouse/main/docker-compose.yml
docker compose up -d
```

Open `http://localhost:3000` (or your server's address) — the setup wizard
walks you through creating your admin account and hands you an invite code
for your friends.

**Adding books:** drop `.epub` files into the `storage/epubs/` directory that
appears next to your compose file, then click **Import books** in the app
(admin only). Covers, page counts, and shelf spines are extracted
automatically.

### Options (all optional)

Set these in a `.env` file next to `docker-compose.yml`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `APP_PORT` | `3000` | Host port to serve on |
| `STORAGE_HOST_PATH` | `./storage` | Where EPUBs/covers/avatars live — point at a big drive |
| `POSTGRES_PASSWORD` | `chapterhouse` | Database password (internal network only, but set your own) |
| `AUTH_SECRET` | auto-generated | Session signing secret; generated and persisted on first boot |
| `AUTH_URL` | request host | Only needed if host detection misbehaves behind your proxy |

### How friends connect

Chapterhouse doesn't care how traffic reaches it — pick whatever fits your
setup:

- **Tailscale** (great for a private club): friends install Tailscale, and you
  either invite them to your tailnet or [share the server
  node](https://tailscale.com/kb/1084/sharing) with their own (free) accounts.
  `tailscale serve` on the host gets you HTTPS with zero certificate work.
  Nothing is ever exposed to the public internet.
- **Reverse proxy + domain** (Caddy, Traefik, Nginx Proxy Manager): the classic
  route. Proxy your domain to the app port; the app trusts the forwarded host
  (`AUTH_TRUST_HOST` is preset). Signup still requires your invite code, so
  being internet-reachable doesn't mean being open.
- **Cloudflare Tunnel**: public HTTPS URL without opening ports.

If sign-in redirects ever go to the wrong host behind a proxy, set `AUTH_URL`
to your public URL.

**Upgrading:** `docker compose pull && docker compose up -d` — migrations run
automatically on startup.

**Backups:** dump the `db` service's Postgres and copy your storage
directory. That's the whole state.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS**
- **Prisma 7** + **PostgreSQL** (via the `pg` driver adapter)
- **NextAuth v5** (Auth.js) — Credentials provider, JWT sessions, bcrypt hashes
- **epub.js** — in-browser EPUB rendering
- **Docker** — prebuilt multi-arch images (amd64/arm64) on GHCR

## Local development

Prerequisites: Node 20+, a running PostgreSQL.

```bash
# 1. Install deps
npm install

# 2. Configure env
cp .env.example .env          # defaults work for a local Postgres

# 3. Create the database (if it doesn't exist) and apply the schema
createdb chapterhouse         # or: psql -c 'CREATE DATABASE chapterhouse;'
npm run db:migrate            # creates tables from prisma/schema.prisma

# 4. Run
npm run dev                   # http://localhost:3000 → setup wizard
```

The first visit walks you through creating the admin account (or run
`npm run db:seed` to create one from the `SEED_*` vars instead).

## Useful scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Unit tests |
| `npm run db:migrate` | Create + apply a dev migration |
| `npm run db:deploy` | Apply migrations (prod / CI) |
| `npm run db:seed` | Seed an admin + invite code (dev convenience) |
| `npm run db:studio` | Prisma Studio |

## Architecture notes

- **Prisma 7**: the DB URL is no longer in `schema.prisma`. The CLI reads it from
  `prisma.config.ts`; the runtime client gets it via the `pg` adapter in
  `src/lib/prisma.ts`.
- **Auth**: `src/auth.config.ts` is the edge-safe config used by the middleware
  proxy; `src/auth.ts` adds the Credentials provider (Prisma + bcrypt, Node
  runtime).
- **Storage**: all file I/O goes through `src/lib/storage.ts` — change one env
  var (`STORAGE_DIR`) to relocate content.
- **First run**: with zero users, all sign-in paths funnel to `/setup`, which
  creates the admin account and the club's invite code in the browser.

See [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) for the feature
roadmap and current status.

## License

[MIT](LICENSE)
