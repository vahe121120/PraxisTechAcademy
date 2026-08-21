# Deployment guide

## Scope of this compose stack

Targets `Admin_Panel_Backend/` and `Frontend/praxis-web/` — confirmed (see
`SECURITY_REVIEW_VERIFIED.md`) as the most complete, cumulative snapshots
of the backend and frontend, out of this repo's several overlapping
project folders (a known, separately-flagged structural issue — see that
review's "open items"). If a different folder turns out to be the actual
deployment target, the fix is two path changes in `docker-compose.yml`
(`build.context` for `backend`/`migrate` and for `frontend`) — nothing else
here depends on which folder it is.

## Before the first deploy — in order

1. **Generate the baseline Prisma migration.** Not optional, not something
   this stack works around — see `docs/MIGRATION_STRATEGY.md`. Without it,
   `docker compose up` will boot a backend against an empty database.
2. **Fill in `.env`** from `.env.example` at the repo root. Every
   `CHANGE_ME` needs a real value — `env.validation.ts`'s Joi schema
   (backend) will refuse to boot on a missing/too-short secret, which is
   the intended behavior, not a bug to work around.
3. **Put a reverse proxy / TLS terminator in front of this.** Deliberately
   not included in `docker-compose.yml` — see that file's comment on why
   (TLS cert issuance/renewal and HSTS configuration deserve their own
   explicitly-versioned config, not a bare inline service that's the first
   thing anyone forgets to harden). Whatever's chosen (managed load
   balancer, or a tracked Caddy/Traefik/nginx config) needs to route:
   - `https://app.<domain>` → `frontend:3000`
   - `https://api.<domain>` → `backend:3000`
   - Both endpoints on the same parent domain as `COOKIE_DOMAIN` in
     `.env`, or the refresh-token cookie (see the earlier security review)
     never reaches the API.
4. **Register the Telegram webhook** against the real public URL, with
   `secret_token` set to `TELEGRAM_WEBHOOK_SECRET` from `.env` — this is a
   one-time `setWebhook` API call, not something this stack automates
   (registering it automatically at container start would mean every
   restart re-registers against whatever URL the container currently
   thinks it's reachable at, which is fragile and better done deliberately
   once per real domain change).
5. **Configure ARCA's webhook URL** with the bank, similarly, pointed at
   `https://api.<domain>/api/v1/payments/arca/webhook` (route confirmed in
   `payments.controller.ts`). Telegram's webhook (step 4) goes to
   `https://api.<domain>/api/v1/telegram/webhook`, confirmed in
   `telegram-webhook.controller.ts`.

## Running it

```bash
cp .env.example .env   # then fill in every CHANGE_ME
docker compose build
docker compose up -d
docker compose logs -f migrate   # confirm the baseline migration applied
docker compose logs -f backend frontend
```

`docker compose ps` should show `postgres` and `backend` as `healthy`
(their `HEALTHCHECK`/`healthcheck:` config), `migrate` as `Exited (0)`
(one-shot, expected to exit — not evidence something is wrong), and
`backup` running continuously.

## What's verified vs. what isn't — read this before trusting any of it blind

Everything in this deployment setup was written against the real,
cloned source (Dockerfiles reference actual scripts/paths that exist,
`docker-compose.yml`'s env var names match what `env.validation.ts`
actually requires, the frontend's build-time `NEXT_PUBLIC_API_URL`
requirement matches its one actual usage in `lib/api/http.ts`) — this
isn't a generic template with placeholders guessed at.

**What it is NOT: built or run.** This sandbox has no Docker daemon and
cannot reach `binaries.prisma.sh` (needed for `npm ci`'s Prisma postinstall
step) or Alpine's package mirrors (needed to actually build the `backup`
image). Concretely, before trusting this in production:

- [ ] `docker compose build` actually succeeds for all three custom images
      (`backend`, `frontend`, `backup`) in an environment with normal
      internet access.
- [ ] The baseline migration (step 1 above) has been generated and
      committed — the `migrate` service is inert without it.
- [ ] `docker compose up` boots cleanly end-to-end: `migrate` applies the
      baseline, `postgres`/`backend` report healthy, `frontend` can reach
      `backend` at the configured `NEXT_PUBLIC_API_URL`.
- [ ] A full login → browse courses → purchase → webhook confirms →
      Telegram access granted flow works against the containerized stack,
      not just against `npm run start:dev` locally.
- [ ] The backup container actually produces a `praxis_*.dump` file and
      `ops/backup/restore.sh` successfully restores it into a scratch
      database (see `docs/BACKUP_STRATEGY.md`'s restore-drill guidance —
      do this once now, not for the first time during a real incident).

None of this is a formality — treat the checklist above as required
verification before this is the thing serving real payment traffic, the
same way the earlier security-fix diff was clearly marked
manually-verified rather than compiler-verified until you ran the real
build.

## What scales and what doesn't, as written

- `backend` and `frontend` are stateless (no in-memory session data beyond
  a single request; auth state is JWT + database) — horizontally scalable
  by simply increasing replica count once this graduates beyond a single
  Docker host, with no code changes.
- `postgres` is a single instance with no replication/failover — the
  right shape for launch, not for a workload that needs to survive a
  database host failure without downtime. See
  `docs/BACKUP_STRATEGY.md`'s note on migrating to a managed Postgres
  provider when that matters.
- Session/rate-limit state (`@nestjs/throttler`) is in-memory per backend
  instance today — fine at one replica; if `backend` is ever scaled to
  multiple replicas, the throttler needs a shared store (Redis) or each
  replica enforces its limit independently, meaning the *effective*
  combined rate limit becomes `limit × replica count`. Worth revisiting
  at that point, not before.
