# Mikrus deploy po klonowaniu repo

Poniżej jest najkrótsza ścieżka dla nowego VPS Mikrus.

## 1. Klonowanie repo

```sh
cd /opt
git clone https://github.com/NikodemJachec99/Dashboard-Bioaddmed.git bioaddmed
cd /opt/bioaddmed
```

## 2. Utworzenie `.env`

```sh
cp .env.example .env
```

Ustaw co najmniej:

- `APP_DOMAIN=bioaddmed.bieda.it`
- `NGINX_HOST_PORT=8080`
- `POSTGRES_PASSWORD=` mocne hasło
- `DJANGO_SECRET_KEY=` długi losowy sekret
- `JWT_SIGNING_KEY=` osobny długi losowy sekret
- `DJANGO_ALLOWED_HOSTS=bioaddmed.bieda.it,localhost,127.0.0.1,backend`
- `DJANGO_CORS_ALLOWED_ORIGINS=https://bioaddmed.bieda.it`
- `DJANGO_CSRF_TRUSTED_ORIGINS=https://bioaddmed.bieda.it`
- `AUTH_COOKIE_DOMAIN=bioaddmed.bieda.it`
- `AUTH_COOKIE_SECURE=True`

## 3. Pierwszy start

```sh
chmod +x deploy/scripts/deploy.sh deploy/scripts/postgres.sh deploy/scripts/backup.sh deploy/scripts/restore.sh
./deploy/scripts/deploy.sh
```

## 4. Komendy PostgreSQL na Mikrusie

Shell do `psql`:

```sh
./deploy/scripts/postgres.sh
```

Lista tabel:

```sh
./deploy/scripts/postgres.sh -c "\dt"
```

Lista użytkowników:

```sh
./deploy/scripts/postgres.sh -c "\du"
```

Sprawdzenie połączenia i czasu:

```sh
./deploy/scripts/postgres.sh -c "select current_database(), current_user, now();"
```

Liczba użytkowników w aplikacji:

```sh
./deploy/scripts/postgres.sh -c "select count(*) from accounts_user;"
```

Backup ręczny:

```sh
./deploy/scripts/backup.sh
```

Restore z pliku:

```sh
./deploy/scripts/restore.sh deploy/backups/20260310-120000.sql
```

## 5. Weryfikacja HTTP na serwerze

```sh
curl -I http://127.0.0.1:8080/health/
curl -I http://127.0.0.1:8080/api/health/
docker compose --env-file .env -f deploy/docker-compose.prod.yml exec -T backend python scripts/smoke_check.py
docker compose --env-file .env -f deploy/docker-compose.prod.yml ps
```

Jeśli w panelu Mikrusa subdomena wskazuje inny lokalny port niż `8080`, ustaw ten sam numer w `NGINX_HOST_PORT`.

## 6. GitHub Actions CD

Do automatycznego deployu ustaw w GitHub Secrets:

- `DEPLOY_HOST`
- `DEPLOY_PORT`
- `DEPLOY_USER`
- `DEPLOY_PATH`
- `DEPLOY_SSH_KEY`

Dla Mikrusa `DEPLOY_PORT` to zwykle port SSH przypisany do VPS, np. `40226`.

## 7. Dodanie admina (jedna linijka)

```sh
cd /opt/bioaddmed && docker compose --env-file .env -f deploy/docker-compose.prod.yml exec -T backend python manage.py shell -c "from apps.accounts.models import User; u,_=User.objects.get_or_create(email='admin2@bioaddmed.local', defaults={'first_name':'Patryk','last_name':'Admin','global_role':'admin','is_staff':True,'is_superuser':True,'is_active':True}); u.first_name='Patryk'; u.last_name='Admin'; u.global_role='admin'; u.is_staff=True; u.is_superuser=True; u.is_active=True; u.set_password('AdminBioaddmed123'); u.save(); print(u.email, u.global_role, u.is_superuser)"
```
