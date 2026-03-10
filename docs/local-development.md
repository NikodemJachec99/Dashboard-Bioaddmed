# Local development

## Wymagania

- Docker i Docker Compose
- Python 3.12 oraz Node 22 lokalnie, jeśli chcesz pracować poza kontenerami

## Start

1. Skopiuj `.env.example` do `.env`.
2. Uzupełnij sekrety.
3. Uruchom `docker compose -f deploy/docker-compose.dev.yml up --build`.
4. W kontenerze `backend` wykonaj:
   - `python manage.py migrate --fake-initial`
   - `python manage.py bootstrap_bioaddmed`

Frontend działa na `http://localhost:5173`, backend na `http://localhost:8000`.
