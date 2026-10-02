#!/usr/bin/env bash
# PostgreSQL backup and restore for AstroSeva.
#
# Runbook (read this before running anything):
#
#   BACKUP (takes a compressed dump; safe to run while the app is serving,
#   because pg_dump reads a consistent snapshot):
#     POSTGRES_PASSWORD=... ./scripts/backup_postgres.sh backup
#
#   LIST backups:
#     ./scripts/backup_postgres.sh list
#
#   RESTORE (destructive: drops and recreates the database; stop the backend
#   first, and confirm the prompt):
#     POSTGRES_PASSWORD=... ./scripts/backup_postgres.sh restore <file>
#
#   What is backed up: the full database (schema + data). What is NOT backed
#   up and must be handled separately:
#     - marketplace upload files (STORAGE_ROOT on disk or its volume),
#     - .env secrets (JWT_SECRET and friends -- without these, tokens and
#       password hashes in a restored database are useless or dangerous),
#     - the Redis cache (ephemeral by design; a restore starts cold).
#
#   Retention is the operator's policy, not this script's: keep at least one
#   known-good restore-tested copy off the database host. An untested backup
#   is a rumor, not a backup -- restore into a scratch database quarterly.
set -euo pipefail

POSTGRES_USER="${POSTGRES_USER:-astroseva}"
POSTGRES_DB="${POSTGRES_DB:-astroseva}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"

cmd="${1:-}"
case "$cmd" in
  backup)
    mkdir -p "$BACKUP_DIR"
    stamp="$(date -u +%Y%m%dT%H%M%SZ)"
    out="$BACKUP_DIR/${POSTGRES_DB}-${stamp}.dump.gz"
    PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
      -h "${POSTGRES_HOST:-localhost}" -U "$POSTGRES_USER" \
      -Fc -Z 9 "$POSTGRES_DB" | gzip > "$out"
    echo "wrote $out ($(du -h "$out" | cut -f1))"
    ;;
  list)
    ls -lh "$BACKUP_DIR" 2>/dev/null || echo "no backups in $BACKUP_DIR"
    ;;
  restore)
    file="${2:-}"
    if [ -z "$file" ]; then echo "usage: $0 restore <file>" >&2; exit 1; fi
    echo "This will DROP and recreate $POSTGRES_DB. Stop the backend first."
    read -r -p "type the database name to confirm: " confirm
    if [ "$confirm" != "$POSTGRES_DB" ]; then echo "aborted." >&2; exit 1; fi
    PGPASSWORD="$POSTGRES_PASSWORD" dropdb \
      -h "${POSTGRES_HOST:-localhost}" -U "$POSTGRES_USER" "$POSTGRES_DB"
    PGPASSWORD="$POSTGRES_PASSWORD" createdb \
      -h "${POSTGRES_HOST:-localhost}" -U "$POSTGRES_USER" "$POSTGRES_DB"
    gunzip -c "$file" | PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
      -h "${POSTGRES_HOST:-localhost}" -U "$POSTGRES_USER" \
      -d "$POSTGRES_DB" --no-owner
    echo "restored $POSTGRES_DB from $file"
    ;;
  *)
    echo "usage: $0 {backup|list|restore <file>}" >&2
    exit 1
    ;;
esac
