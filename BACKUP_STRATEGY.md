# Backup strategy

## What's implemented (`ops/backup/`)

A dedicated `backup` container (see `docker-compose.yml`) that:
1. Takes an immediate `pg_dump` on first start (so a freshly deployed stack
   isn't backup-less for up to 24h waiting on the schedule).
2. Runs `pg_dump --format=custom` on the schedule in `BACKUP_SCHEDULE_CRON`
   (default: daily at 03:00 UTC), writing to a Docker named volume
   (`praxis_postgres_backups`) shared with the `postgres` service.
3. Prunes backups older than `BACKUP_RETENTION_DAYS` (default: 14) after
   every successful run.

Custom format (`-Fc`), not plain SQL: it's compressed, and restorable
selectively or in parallel via `pg_restore` (a specific table, schema-only,
data-only) rather than only "the whole file or nothing" the way a plain
`.sql` dump forces.

## What this protects against, and what it doesn't

**Protects against:** accidental data deletion, a bad migration, application
bugs that corrupt data, a compromised admin account making destructive
changes — anything where you need to go back to a known-good point in time
on the *same* infrastructure.

**Does NOT protect against:** total loss of the Docker host itself (disk
failure, host deleted, datacenter/region outage). The backup volume lives
on the same host as the database it's backing up. **This is the single
biggest gap in the current setup and needs a decision, not just
awareness of it:**

- **Minimum viable fix:** a scheduled job *outside* this compose stack
  (host cron, or a small addition to the `backup` container) that syncs
  `/backups` to off-host object storage — `aws s3 sync`, `rclone`, or
  equivalent. Not implemented here because it requires choosing a specific
  provider/credentials, which is an infrastructure decision, not a code
  one.
- **Stronger option, if/when this graduates off a single Docker host:** a
  managed Postgres provider (RDS, Cloud SQL, Neon, Supabase) with built-in
  point-in-time recovery and cross-region backup replication, which
  removes this entire category of risk rather than mitigating it.

Until off-host replication exists in some form, treat this backup system
as protecting against *application-level* mistakes, not *infrastructure*
loss.

## Retention policy

14 days by default (`BACKUP_RETENTION_DAYS`). Rationale: covers "we didn't
notice a data problem until the following work week," which is the
realistic detection window for most issues that aren't caught immediately.
Extend it if the business needs longer historical recovery (e.g.
regulatory/financial record-keeping requirements) — that's a policy
decision this document can't make on your behalf, only flag as one to
make deliberately rather than leave at the code default.

## Restore process

`ops/backup/restore.sh <backup-file> <target-database-url>` —
deliberately **manual-only**, never wired into any automated path. A
restore is destructive (`pg_restore --clean` drops existing objects before
recreating them) and must always be a deliberate action against a specific
incident, taken by a person, never something a misconfigured schedule
could trigger.

The script requires typing the target database's name back as
confirmation before proceeding — a deliberate extra step given the
consequence of running it against the wrong target.

```bash
# From inside the backup container, or anywhere with pg_restore + network
# access to the target database:
./ops/backup/restore.sh /backups/praxis_20260817T030000Z.dump \
  "postgresql://praxis_app:PASSWORD@postgres:5432/praxis?schema=public"
```

## Restore drills — the part every backup strategy is missing until it isn't

**A backup that has never been restored is not a verified backup.**
Corruption, an incomplete dump, or a format incompatibility can all sit
undetected in a backup file for months. Concretely:

- Monthly (or after any major schema migration), restore the most recent
  backup into a scratch database — never production — and verify: the
  restore command exits 0, row counts on a few key tables look sane
  (`orders`, `payments`, `subscriptions`), and the application actually
  boots and reads correctly against the restored database.
- This isn't automated here deliberately — a "successful" automated
  restore-drill script that's never actually looked at by a human is only
  marginally better than not drilling at all. Put it on a calendar, not
  just in a cron job.

## Logging and monitoring the backup process itself

`entrypoint.sh` runs cron with `-d 8` (debug logging to stderr), and
`backup.sh` logs start/success/failure/pruning to stdout — both land in
`docker compose logs backup` / whatever log aggregator is set up per
`docs/LOGGING_STRATEGY.md`. **Alert on backup failure specifically** —a
silently-failing nightly backup is the worst version of this problem,
since nothing looks wrong until the day a restore is actually needed. At
minimum, a scheduled check (even a simple daily script checking that a
`praxis_*.dump` file newer than 25 hours exists in the backup volume)
wired to whatever alerting the team already uses is worth the half hour it
takes to set up.
