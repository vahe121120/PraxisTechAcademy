#!/bin/sh
# =============================================================================
# docker-migrate.sh — one-shot Prisma migration runner
#
# Runs inside the `migrate` container (see docker-compose.yml).
# Applies any pending migrations and exits.  The `backend` service only starts
# after this container exits 0, so a failed migration blocks the deploy rather
# than letting the app start against a mismatched schema.
# =============================================================================
set -e

echo "[migrate] Running prisma migrate deploy …"
npx prisma migrate deploy
echo "[migrate] Migrations applied successfully."
