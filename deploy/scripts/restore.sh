#!/bin/sh
set -eu

if [ $# -ne 1 ]; then
  echo "Uzycie: ./deploy/scripts/restore.sh deploy/backups/20260310-120000.sql"
  exit 1
fi

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-deploy/docker-compose.prod.yml}"
BACKUP_FILE="$1"

cd "$APP_DIR"
[ -f .env ] && set -a && . ./.env && set +a

cat "$BACKUP_FILE" | docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
