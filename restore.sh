#!/bin/sh
set -eu

# -----------------------------------------------------------------------------
# Restores a backup produced by backup.sh. Deliberately manual-only — never
# wired into any scheduled job or startup path. A restore is destructive
# and must always be a deliberate, reviewed action by a person, taken
# against a specific incident, never something that could fire
# automatically from a misconfigured schedule.
#
# USAGE (run from inside the backup or postgres container, or anywhere
# with network access to the target database and pg_restore installed):
#   ./restore.sh /backups/praxis_20260817T030000Z.dump postgresql://user:pass@host:5432/dbname
#
# This restores into the database named in the target URL AS-IS — it does
# not create a new database for you and does not ask for confirmation
# beyond the explicit prompt below. Point this at a scratch/staging
# database to verify a backup, never directly at production, unless
# production recovery is exactly the intent right now.
# -----------------------------------------------------------------------------

BACKUP_FILE="${1:-}"
TARGET_URL="${2:-}"

if [ -z "$BACKUP_FILE" ] || [ -z "$TARGET_URL" ]; then
  echo "Usage: $0 <backup-file.dump> <postgresql-target-url>" >&2
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "FATAL: backup file not found: ${BACKUP_FILE}" >&2
  exit 1
fi

REDACTED_TARGET=$(echo "$TARGET_URL" | sed -E 's#(://[^:]+:)[^@]+(@)#\1***\2#')
echo "About to restore:"
echo "  Source: ${BACKUP_FILE}"
echo "  Target: ${REDACTED_TARGET}"
echo
echo "This will run pg_restore with --clean, which DROPS existing objects in"
echo "the target database before recreating them from the backup. Any data"
echo "in the target database that is not in this backup will be lost."
echo
printf "Type the target database name to confirm: "
read -r CONFIRM_NAME

TARGET_DB_NAME=$(echo "$TARGET_URL" | sed -E 's#.*/([^/?]+)(\?.*)?$#\1#')
if [ "$CONFIRM_NAME" != "$TARGET_DB_NAME" ]; then
  echo "Confirmation did not match database name '${TARGET_DB_NAME}' — aborting." >&2
  exit 1
fi

echo "[restore] Starting pg_restore..."
# --clean --if-exists: drop existing objects first (idempotent — safe to
# run against a database that already has the old schema/data in it, not
# just an empty one). --no-owner/--no-privileges: matches backup.sh's
# dump flags, so ownership/grants from the source environment don't leak
# into and conflict with the target environment's own role setup.
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname="$TARGET_URL" \
  "$BACKUP_FILE"

echo "[restore] Completed. Verify application behavior against this database before directing production traffic at it."
