import http.cookiejar
import json
import os
import sys
import urllib.request


def request_json(opener, url, method="GET", payload=None):
    body = None
    headers = {}
    if payload is not None:
        body = json.dumps(payload).encode()
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    with opener.open(request) as response:
        content = response.read().decode() or "{}"
        return response.status, json.loads(content)


def main():
    base_url = os.getenv("SMOKE_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
    email = os.getenv("SMOKE_EMAIL", os.getenv("DJANGO_SUPERUSER_EMAIL", "admin@bioaddmed.local"))
    password = os.getenv("SMOKE_PASSWORD", os.getenv("DJANGO_SUPERUSER_PASSWORD", "change-me"))

    health_url = f"{base_url}/health/"
    login_url = f"{base_url}/api/auth/login/"
    me_url = f"{base_url}/api/auth/me/"

    jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

    health_status, health_payload = request_json(opener, health_url)
    login_status, login_payload = request_json(
        opener,
        login_url,
        method="POST",
        payload={"email": email, "password": password},
    )
    me_status, me_payload = request_json(opener, me_url)

    cookie_names = sorted(cookie.name for cookie in jar)
    print(json.dumps(
        {
            "health_status": health_status,
            "health_payload": health_payload,
            "login_status": login_status,
            "login_email": login_payload.get("email"),
            "cookie_names": cookie_names,
            "me_status": me_status,
            "me_email": me_payload.get("email"),
        },
        ensure_ascii=True,
    ))

    if health_status != 200 or login_status != 200 or me_status != 200:
        sys.exit(1)


if __name__ == "__main__":
    main()
