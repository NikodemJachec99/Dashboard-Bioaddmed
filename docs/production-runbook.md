# Production runbook

## Założenia

- aplikacja działa z `deploy/docker-compose.prod.yml`
- repo na serwerze leży w `/opt/bioaddmed`
- konfiguracja środowiska znajduje się w `/opt/bioaddmed/.env`
- port `40226` z Mikrusa traktuj jako port SSH, nie port HTTP aplikacji

## Wymagania hosta

- Docker
- Docker Compose
- dostęp SSH do VPS
- skonfigurowana subdomena `bioaddmed.bieda.it` kierująca na port HTTP aplikacji ustawiony w `NGINX_HOST_PORT`

## Standardowy deploy

```sh
cd /opt/bioaddmed
chmod +x deploy/scripts/deploy.sh
./deploy/scripts/deploy.sh
```

Skrypt wykona:

- podniesienie `postgres` i `redis`
- build i start `backend`, `worker`, `beat`, `nginx`
- `python manage.py migrate`
- `collectstatic`
- `bootstrap_bioaddmed`
- `check --deploy`

## Operacje bieżące

```sh
cd /opt/bioaddmed
docker compose -f deploy/docker-compose.prod.yml ps
docker compose -f deploy/docker-compose.prod.yml logs -f
docker compose -f deploy/docker-compose.prod.yml restart
```

## Backup i restore

```sh
cd /opt/bioaddmed
chmod +x deploy/scripts/backup.sh deploy/scripts/restore.sh
./deploy/scripts/backup.sh
./deploy/scripts/restore.sh deploy/backups/20260310-120000.sql
```

## PostgreSQL shell

```sh
cd /opt/bioaddmed
chmod +x deploy/scripts/postgres.sh
./deploy/scripts/postgres.sh
./deploy/scripts/postgres.sh -c "\dt"
./deploy/scripts/postgres.sh -c "select now();"
```

## Weryfikacja po deployu

```sh
curl -I http://127.0.0.1:${NGINX_HOST_PORT:-8080}/health/
curl -I http://127.0.0.1:${NGINX_HOST_PORT:-8080}/api/health/
docker compose --env-file .env -f deploy/docker-compose.prod.yml exec -T backend python scripts/smoke_check.py
docker compose --env-file .env -f deploy/docker-compose.prod.yml ps
```

## GitHub Actions secrets

- `DEPLOY_HOST`
- `DEPLOY_PORT`
- `DEPLOY_USER`
- `DEPLOY_PATH`
- `DEPLOY_SSH_KEY`
