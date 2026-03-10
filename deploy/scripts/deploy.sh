#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/opt/bioaddmed}"
COMPOSE_FILE="${COMPOSE_FILE:-deploy/docker-compose.prod.yml}"

cd "$APP_DIR"
[ -f .env ] && set -a && . ./.env && set +a

docker compose -f "$COMPOSE_FILE" pull || true
docker compose -f "$COMPOSE_FILE" up -d postgres redis
docker compose -f "$COMPOSE_FILE" up -d --build backend worker beat nginx
docker compose -f "$COMPOSE_FILE" exec -T -u root backend sh -lc "mkdir -p /app/staticfiles /app/media && chown -R app:app /app/staticfiles /app/media"
docker compose -f "$COMPOSE_FILE" exec -T backend python manage.py migrate --fake-initial
docker compose -f "$COMPOSE_FILE" exec -T backend python manage.py collectstatic --noinput
docker compose -f "$COMPOSE_FILE" exec -T backend python manage.py bootstrap_bioaddmed
docker compose -f "$COMPOSE_FILE" exec -T backend python manage.py check --deploy
docker compose -f "$COMPOSE_FILE" ps
