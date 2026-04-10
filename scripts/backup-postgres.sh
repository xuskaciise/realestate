#!/usr/bin/env bash
# Dump PostgreSQL from the Docker Compose `db` service to a gzip file.
# Run on the VPS from the project directory (same folder as docker-compose.yml).
# Schedule with cron, e.g. daily at 02:15:
#   15 2 * * * cd /opt/my_realestate && ./scripts/backup-postgres.sh >> /var/log/pg-backup.log 2>&1
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "Missing .env in $ROOT_DIR" >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

: "${POSTGRES_USER:?POSTGRES_USER not set in .env}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD not set in .env}"
: "${POSTGRES_DB:?POSTGRES_DB not set in .env}"

BACKUP_ROOT="${BACKUP_ROOT:-$ROOT_DIR/backups}"
mkdir -p "$BACKUP_ROOT"

STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="$BACKUP_ROOT/${POSTGRES_DB}_${STAMP}.sql.gz"

docker compose exec -T \
  -e "PGPASSWORD=${POSTGRES_PASSWORD}" \
  db \
  pg_dump -U "$POSTGRES_USER" --no-owner --format=plain "$POSTGRES_DB" \
  | gzip -c >"$OUT"

echo "Backup written: $OUT"
find "$BACKUP_ROOT" -name "${POSTGRES_DB}_*.sql.gz" -mtime +14 -delete 2>/dev/null || true
