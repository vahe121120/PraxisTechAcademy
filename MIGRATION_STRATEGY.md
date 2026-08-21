# Migration strategy

## Current state — read this first

**`Admin_Panel_Backend/prisma/migrations/` does not exist.** The schema was
developed against `schema.prisma` directly (almost certainly via `prisma db
push` during iteration), never through `prisma migrate dev`. There is no
migration history to deploy yet — `docker-compose.yml`'s `migrate` service
will run `prisma migrate deploy` against an empty `migrations/` folder and
succeed trivially, applying nothing, leaving the target database with no
schema at all.

**This has to be fixed once, by hand, before this stack is deployed
anywhere for real** — and it can't be done from inside this review, because
generating a correct baseline migration requires Prisma's own tooling
running against a real (even if disposable/local) Postgres instance, and
this sandbox cannot reach `binaries.prisma.sh` to fetch Prisma's engine
binaries. Hand-writing the equivalent SQL is not an acceptable substitute —
Prisma's exact DDL (constraint names, index names, enum creation order,
default-value expressions) has to come from Prisma itself, or a
hand-written migration risks silently drifting from what `schema.prisma`
actually specifies, discovered only when `prisma migrate diff` (or a future
`migrate dev`) reports unexpected drift against production.

### One-time step, in an environment with real network access

```bash
cd Admin_Panel_Backend
# Point at any disposable local/dev Postgres — never production.
export DATABASE_URL="postgresql://praxis_app:devpassword@localhost:5432/praxis_dev?schema=public"
export DIRECT_URL="$DATABASE_URL"

npx prisma migrate dev --name init
```

This inspects the already-applied (via `db push`) schema against an empty
migration history, generates `prisma/migrations/<timestamp>_init/`
containing the full baseline DDL, and applies it to the dev database.
**Commit the generated `prisma/migrations/` directory to git.** From that
point on, `docker-compose.yml`'s `migrate` service will correctly apply it
(and every migration after it) on every deploy.

Run `prisma migrate dev` again, locally, every time `schema.prisma`
changes from here forward — never edit `schema.prisma` and skip straight
to `docker compose up` expecting the migrate service to figure it out;
`migrate deploy` only ever applies migration files that already exist on
disk, it never generates them.

---

## Ongoing strategy, once the baseline exists

### The two Prisma commands, and why both exist
- **`prisma migrate dev`** — local development only. Generates new
  migration files by diffing `schema.prisma` against migration history,
  applies them to your local database, and will prompt to reset the
  database if it detects drift. Never run this against a shared or
  production database — the reset-on-drift behavior is destructive.
- **`prisma migrate deploy`** — the only command that should ever touch a
  shared environment (staging, production). It never generates migrations,
  never prompts, never resets. It applies whatever migration files already
  exist in `prisma/migrations/`, in filename-timestamp order, and fails
  loudly if the migration history in the target database's
  `_prisma_migrations` table has diverged from what's on disk (e.g. a
  migration file was edited after already being applied somewhere).

`docker-compose.yml`'s `migrate` service runs the second one, exclusively.

### Why migration application is a separate step from app startup
`scripts/docker-migrate.sh` and the dedicated `migrate` compose service
exist instead of running `prisma migrate deploy` inside the backend
container's own boot sequence, for three concrete reasons:

1. **One clear failure point.** If migration application were part of
   every backend replica's startup, a failing migration would surface as N
   crash-looping containers instead of one failed step a deploy pipeline
   can gate on and alert about distinctly from "the app itself won't
   boot."
2. **No redundant concurrent attempts.** `migrate deploy` takes an
   advisory lock and is safe to run concurrently, but there's no reason
   for N replicas to all attempt it on every restart — one explicit run is
   simpler to reason about and to read logs for.
3. **Deploy ordering is explicit, not implicit.** `depends_on: migrate:
   condition: service_completed_successfully` on the `backend` service
   means Docker Compose itself enforces "schema must be up to date before
   the app starts," rather than relying on the app's own code to detect
   and tolerate a stale schema at request time.

### Writing migrations safely — the expand/contract pattern
A rolling or zero-downtime deploy means old and new application code can
both be running against the database simultaneously for a short window.
Two rules make that safe:

- **Never remove or rename a column/table in the same migration that
  removes the application code using it.** Old code (still running during
  the deploy) will error on every request the instant the column
  disappears. Split it into two deploys: (1) ship application code that
  stops reading/writing the old column but the column still exists and is
  still nullable/has a default, deploy, confirm it's healthy; (2) only
  then ship a migration that drops the now-unused column, in a later
  deploy.
- **Adding a required (`NOT NULL`, no default) column is unsafe in one
  step against a table with existing rows** — Postgres has to rewrite/
  validate every row, and any concurrent write in the old code path that
  doesn't set the new column fails immediately. Add it nullable (or with a
  default) first, backfill, then tighten to `NOT NULL` in a later
  migration once every row has a value and every code path sets it.

This project's `prisma/constraints.sql` (CHECK constraints and triggers
Prisma's schema language can't express — confirmed to exist, per the
earlier security review) needs the same discipline: changes to it are
still schema changes and belong in a migration, applied through the same
`migrate deploy` step, not run ad hoc against production.

### Rollback
Prisma has no built-in automatic rollback — `migrate deploy` only ever
moves forward. Two situations, two different correct responses:

- **A migration fails partway through deploy** (e.g. a constraint
  violation against existing data): the `migrate` service exits non-zero,
  `backend`'s `depends_on` condition is never satisfied, and the deploy
  stops with the *old* application version still running against the *old*
  schema — nothing served traffic against a half-migrated database. Fix
  the migration, commit a new one (never edit the failed one in place if
  it partially applied), and redeploy.
- **A migration succeeds but the resulting behavior is wrong** (a working
  migration, a bad decision): write and deploy a new forward migration
  that corrects it. Do not attempt to hand-edit `_prisma_migrations` or
  delete an already-applied migration file to "undo" it — that desyncs the
  migration history from what actually happened to the schema, which is
  exactly the state `migrate deploy`'s drift detection exists to catch and
  refuse to proceed past.

### CI recommendation
Run `prisma migrate deploy` against a disposable staging database as part
of the deploy pipeline, before production — the same command, same
migration files, same script (`scripts/docker-migrate.sh`), just pointed
at a different `DATABASE_URL`/`DIRECT_URL`. This is what actually catches
a migration problem before it reaches production, rather than discovering
it live.
