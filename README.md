# Chapterhouse

A self-hosted, private social reading app for you and your friends — a book
club in a box. In-app EPUB reader with automatic progress tracking, a shared
catalog, a monthly book-club pick, per-book discussion, and a group activity
feed. One instance hosts one club.

Each instance is private: members join by invite code, and books are EPUB
files the instance owner supplies.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS**
- **Prisma 7** + **PostgreSQL** (via the `pg` driver adapter)
- **NextAuth v5** (Auth.js) — Credentials provider, JWT sessions, bcrypt hashes
- **epub.js** — in-browser EPUB rendering (reader, upcoming milestone)
- **Docker** — self-hosted; EPUBs/covers live on an external drive bind-mounted to `/data`

## Local development

Prerequisites: Node 20+, a running PostgreSQL.

```bash
# 1. Install deps
npm install

# 2. Configure env
cp .env.example .env          # then edit values; generate a secret:
openssl rand -base64 32       # -> paste into AUTH_SECRET

# 3. Create the database (if it doesn't exist) and apply the schema
createdb bookclub             # or: psql -c 'CREATE DATABASE bookclub;'
npm run db:migrate            # creates tables from prisma/schema.prisma

# 4. Seed the first admin + invite code (uses SEED_* vars in .env)
npm run db:seed

# 5. Run
npm run dev                   # http://localhost:3000
```

Log in with the seeded admin, or register a new account at `/signup` using the
seeded invite code.

## Useful scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Create + apply a dev migration |
| `npm run db:deploy` | Apply migrations (prod / CI) |
| `npm run db:seed` | Seed admin + invite code |
| `npm run db:studio` | Prisma Studio |

## Deploying on your server (Docker)

EPUBs, cover images, and avatars are written to `STORAGE_DIR`, which the
container exposes at `/data` and which is bind-mounted from a directory on the
host (put it somewhere with room for your library).

```bash
# In .env on the server, set at minimum:
#   AUTH_SECRET=...                 (openssl rand -base64 32)
#   AUTH_URL=http://your-server:3000
#   POSTGRES_PASSWORD=...
#   STORAGE_HOST_PATH=/mnt/external/chapterhouse   # host dir for books/covers

docker compose up -d --build
```

On startup the app container runs `prisma migrate deploy` automatically. To seed
the first admin/invite after the first deploy:

```bash
docker compose exec app npm run db:seed
```

## Architecture notes

- **Prisma 7**: the DB URL is no longer in `schema.prisma`. The CLI reads it from
  `prisma.config.ts`; the runtime client gets it via the `pg` adapter in
  `src/lib/prisma.ts`.
- **Auth**: `src/auth.config.ts` is the edge-safe config used by `middleware.ts`;
  `src/auth.ts` adds the Credentials provider (Prisma + bcrypt, Node runtime).
- **Storage**: all file I/O goes through `src/lib/storage.ts` — change one env var
  (`STORAGE_DIR`) to relocate content.

See [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) for the feature
roadmap and current status.
