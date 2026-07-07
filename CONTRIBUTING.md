# Contributing to Chapterhouse

Thanks for your interest! Chapterhouse is a small, self-hosted book-club app,
and contributions — bug reports, fixes, and focused features — are welcome.

## Before you start

- **Bugs:** open an issue with steps to reproduce, what you expected, and what
  happened (include the app version / image tag).
- **Features:** open an issue to discuss first, especially for anything larger
  than a small, self-contained change. Chapterhouse deliberately stays scoped to
  *one private club per instance* — please keep proposals in that spirit.
- **Security issues:** don't open a public issue — see
  [SECURITY.md](SECURITY.md).

## Development setup

Prerequisites: Node 20+ and a running PostgreSQL. Full walkthrough is in the
[README](README.md#local-development); the short version:

```bash
npm install
cp .env.example .env        # defaults work for a local Postgres
createdb chapterhouse
npm run db:migrate          # apply the schema
npm run dev                 # http://localhost:3000 → first-run setup wizard
```

## Before you open a PR

Run the same checks CI runs — all three must pass:

```bash
npm run typecheck   # tsc --noEmit
npm test            # unit tests
npm run build       # production build
```

CI additionally validates the Docker Compose config and builds the image, so
avoid changes that would break the container build.

## Guidelines

- **Keep PRs focused.** One logical change per PR; separate unrelated cleanups.
- **Match the surrounding style.** TypeScript throughout; follow the existing
  naming, formatting, and comment density rather than introducing new patterns.
- **Add tests for logic.** The suite (`tests/`) favors pure, dependency-free
  unit tests — extract decision logic into `src/lib/` and test it there rather
  than standing up a database. See `tests/shelf-transition.test.ts` and
  `tests/account-schema.test.ts` for the pattern.
- **Database changes** go through Prisma migrations (`npm run db:migrate`);
  commit the generated migration alongside the schema change.
- **Write clear commit messages** describing what changed and why.

## Project layout

- `src/app/` — Next.js App Router pages and API routes
- `src/components/` — React components
- `src/lib/` — framework-agnostic logic (the testable core)
- `prisma/` — schema, migrations, and maintenance scripts
- `tests/` — `node:test` unit tests
- `docs/IMPLEMENTATION_PLAN.md` — feature roadmap and status

By contributing, you agree that your contributions are licensed under the
project's [MIT License](LICENSE).
