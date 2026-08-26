#!/bin/bash
# =============================================================================
# backup.sh — pg_dump wrapper
#
# Called by crond on BACKUP_SCHEDULE_CRON.
# Dumps the database and removes backups older than BACKUP_RETENTION_DAYS.
# Backups land in /backups (mounted from the postgres_backups volume).
# =============================================================================
set -euo pipefail

BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="${BACKUP_DIR}/praxis_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

echo "[backup] Starting dump → ${FILENAME}"

pg_dump "${DATABASE_URL}" | gzip > "${FILENAME}"

echo "[backup] Dump complete: ${FILENAME} ($(du -sh "${FILENAME}" | cut -f1))"

# Prune old backups
echo "[backup] Pruning backups older than ${RETENTION_DAYS} days …"
find "${BACKUP_DIR}" -name "praxis_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
echo "[backup] Done."
