# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Report privately via GitHub's [private vulnerability
reporting](https://github.com/dillon-webster/chapterhouse/security/advisories/new)
(Security tab → *Report a vulnerability*), or email **dillon.webster15@gmail.com**
with the details.

Please include:

- what you found and where (file, endpoint, or page),
- steps to reproduce or a proof of concept,
- the impact you think it has.

This is a small, hobby-scale project maintained by one person, so there's no
formal SLA — but I'll acknowledge reports as soon as I reasonably can and keep
you posted on a fix. Coordinated disclosure is appreciated: give me a chance to
ship a patch before publishing details.

## Supported versions

Fixes land on `main` and ship in the next tagged release / `latest` image.
Only the most recent release is supported — if you're running an older image,
upgrade before reporting (`docker compose pull && docker compose up -d`).

## Security model

Chapterhouse is designed as a **private, single-club instance**, and its
safety assumptions follow from that:

- **Invite-only signup.** Account creation always requires the club's shared
  invite code, so an internet-reachable instance still isn't openly joinable.
  The signup and first-run setup endpoints are rate-limited (per client IP) to
  slow code guessing and mass-account creation.
- **First-run setup self-closes.** `/api/setup` creates the admin account only
  while the instance has zero users; once anyone exists it is inert, guarded by
  a transactional user-count check.
- **Passwords** are hashed with bcrypt (cost 12); plaintext is never stored.
  Sessions are stateless JWTs (NextAuth v5, Credentials provider).
- **All content is auth-gated.** Covers, EPUB files, and avatars are served
  through session-checked API routes, not as public static assets. Admin-only
  actions (book import, delete, setting the club pick) additionally check
  `isAdmin`.
- **Rate limiting is in-memory and per-process.** This matches the intended
  single-container deployment. If you run **multiple app replicas** behind a
  load balancer, the limiter counts per replica rather than globally — put a
  shared limiter at your proxy if that matters to you.
- **Trust boundary.** The app trusts `X-Forwarded-For` / `X-Real-IP` and the
  forwarded host from your reverse proxy. Only expose it behind a proxy you
  control (or a private network like Tailscale); don't expose the raw app port
  to the internet.

### Out of scope

Because instances are self-hosted and private, the following are the operator's
responsibility, not app vulnerabilities:

- securing the host, the Postgres service, and the storage directory,
- setting a strong `POSTGRES_PASSWORD` and protecting the persisted
  `AUTH_SECRET`,
- terminating TLS at your proxy,
- trusting the members you hand invite codes to, and the EPUB files you import.
