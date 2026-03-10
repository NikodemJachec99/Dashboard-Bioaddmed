# Go-live checklist

- DNS subdomeny `bioaddmed.bieda.it` wskazuje na Mikrus port `40226`
- `.env` na VPS zawiera finalne sekrety i produkcyjne hosty
- migracje wykonane
- `collectstatic` wykonane
- konto admina utworzone
- healthcheck `/health/` odpowiada `200`
- logi Nginx i backendu nie pokazują błędów startowych
- backup `pg_dump` działa
- GitHub Actions ma skonfigurowane `DEPLOY_HOST`, `DEPLOY_PORT`, `DEPLOY_USER`, `DEPLOY_PATH`, `DEPLOY_SSH_KEY`
