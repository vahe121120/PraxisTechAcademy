#!/bin/bash
# =============================================================================
# entrypoint.sh — write cron schedule from env, then run crond in foreground.
# =============================================================================
set -euo pipefail

SCHEDULE="${BACKUP_SCHEDULE_CRON:-0 3 * * *}"

echo "[entrypoint] Installing cron schedule: ${SCHEDULE}"
echo "${SCHEDULE} /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root

echo "[entrypoint] Starting crond …"
exec crond -f -L /var/log/backup.log
