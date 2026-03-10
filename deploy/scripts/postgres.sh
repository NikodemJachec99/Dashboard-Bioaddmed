#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-deploy/docker-compose.prod.yml}"

cd "$APP_DIR"
[ -f .env ] && set -a && . ./.env && set +a

docker compose -f "$COMPOSE_FILE" exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$@"
