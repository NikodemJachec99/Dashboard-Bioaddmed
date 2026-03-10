# BioAddMed Hub

Monorepo aplikacji operacyjnej dla koła naukowego BioAddMed.

## Stack

- Backend: Django 5, Django REST Framework, PostgreSQL, Redis, Celery
- Frontend: React 19, TypeScript, Vite, Tailwind, Radix UI
- Infrastruktura: Docker Compose, Nginx, GitHub Actions, VPS Mikrus

## Struktura

```text
backend/   backend API, admin, worker, testy
frontend/  aplikacja React
deploy/    Docker, Nginx, skrypty operacyjne
docs/      runbooki i checklisty wdrożeniowe
```

## Szybki start

1. Skopiuj `.env.example` do `.env`.
2. Uzupełnij sekrety i adresy hostów.
3. Dla dev uruchom `deploy/scripts/run-dev-stack.ps1`.
4. Dla produkcji użyj `deploy/scripts/deploy.sh`.

## Produkcja na Mikrusie

Najważniejsza uwaga: port `40226` od Mikrusa traktuj jako port SSH do deployu, nie jako port HTTP aplikacji. Port HTTP ustawiasz przez `NGINX_HOST_PORT` w `.env`.

Pełna instrukcja:

- [docs/local-development.md](docs/local-development.md)
- [docs/production-runbook.md](docs/production-runbook.md)
- [docs/mikrus-deploy.md](docs/mikrus-deploy.md)
