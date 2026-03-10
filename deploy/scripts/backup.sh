#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-deploy/docker-compose.prod.yml}"

cd "$APP_DIR"
[ -f .env ] && set -a && . ./.env && set +a

mkdir -p deploy/backups
timestamp=$(date +%Y%m%d-%H%M%S)
docker compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "deploy/backups/${timestamp}.sql"
