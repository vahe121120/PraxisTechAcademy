#!/bin/sh
set -eu

# -----------------------------------------------------------------------------
# Takes one logical backup of the database and prunes backups older than
# BACKUP_RETENTION_DAYS. See docs/BACKUP_STRATEGY.md for the full policy
# (schedule, retention rationale, restore drill process, off-host copy).
# -----------------------------------------------------------------------------

BACKUP_DIR=/backups
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="${BACKUP_DIR}/praxis_${TIMESTAMP}.dump"
DEST_TMP="${DEST}.in-progress"

echo "[backup] Starting: ${DEST}"

# -Fc (custom format): compressed, and restorable selectively/in parallel
# via pg_restore — unlike plain-SQL `pg_dump > file.sql`, this format also
# lets a restore target a single table or skip data-vs-schema independently
# without re-running the whole dump.
#
# Writes to a `.in-progress` temp name and atomically renames on success —
# a backup that fails partway through (disk full, connection drop) must
# never leave a truncated file sitting at the final name where a later
# retention-pruning pass or a hurried restore could mistake it for a
# complete, valid backup.
if pg_dump --format=custom --no-owner --no-privileges --file="$DEST_TMP" "$DATABASE_URL"; then
  mv "$DEST_TMP" "$DEST"
  echo "[backup] Completed: ${DEST} ($(du -h "$DEST" | cut -f1))"
else
  status=$?
  echo "[backup] FAILED (exit ${status}) — removing incomplete file." >&2
  rm -f "$DEST_TMP"
  exit "$status"
fi

# --- Retention: delete backups older than BACKUP_RETENTION_DAYS ------------
# Deliberately scoped to this directory's own `praxis_*.dump` naming
# pattern only — never a bare `find /backups -mtime ...` across the whole
# directory, so an unrelated file someone drops in `/backups` for a manual
# restore test is never silently swept up by the nightly prune.
echo "[backup] Pruning backups older than ${BACKUP_RETENTION_DAYS} days."
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'praxis_*.dump' -mtime "+${BACKUP_RETENTION_DAYS}" -print -delete

REMAINING=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'praxis_*.dump' | wc -l)
echo "[backup] Done. ${REMAINING} backup(s) currently retained."
