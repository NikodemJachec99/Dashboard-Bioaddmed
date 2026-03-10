import json
import os
import sys
from urllib.error import HTTPError
import urllib.request


def request_json(opener, url, method="GET", payload=None, headers=None):
    body = None
    request_headers = headers.copy() if headers else {}
    if payload is not None:
        body = json.dumps(payload).encode()
        request_headers["Content-Type"] = "application/json"

    request = urllib.request.Request(url, data=body, headers=request_headers, method=method)
    try:
        with opener.open(request) as response:
            content = response.read().decode() or "{}"
            return response.status, json.loads(content), response.headers
    except HTTPError as error:
        content = error.read().decode() or "{}"
        try:
            payload = json.loads(content)
        except json.JSONDecodeError:
            payload = {"detail": content}
        return error.code, payload, error.headers


def main():
    base_url = os.getenv("SMOKE_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
    email = os.getenv("SMOKE_EMAIL", os.getenv("DJANGO_SUPERUSER_EMAIL", "admin@bioaddmed.local"))
    password = os.getenv("SMOKE_PASSWORD", os.getenv("DJANGO_SUPERUSER_PASSWORD", "change-me"))

    health_url = f"{base_url}/health/"
    login_url = f"{base_url}/api/auth/login/"
    me_url = f"{base_url}/api/auth/me/"

    opener = urllib.request.build_opener()

    health_status, health_payload, _ = request_json(opener, health_url)
    login_status, login_payload, login_headers = request_json(
        opener,
        login_url,
        method="POST",
        payload={"email": email, "password": password},
    )
    cookie_pairs = []
    for set_cookie in login_headers.get_all("Set-Cookie", []):
        cookie_pair = set_cookie.split(";", 1)[0].strip()
        if cookie_pair:
            cookie_pairs.append(cookie_pair)

    me_headers = {"Cookie": "; ".join(cookie_pairs)} if cookie_pairs else None
    me_status, me_payload, _ = request_json(opener, me_url, headers=me_headers)

    cookie_names = sorted(cookie.split("=", 1)[0] for cookie in cookie_pairs if "=" in cookie)
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
