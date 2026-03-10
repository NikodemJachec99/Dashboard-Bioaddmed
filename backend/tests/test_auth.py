import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_login_sets_auth_cookies(user_factory):
    user_factory(email="admin@example.com")
    client = APIClient()
    response = client.post("/api/auth/login/", {"email": "admin@example.com", "password": "password123!"}, format="json")
    assert response.status_code == 200
    assert "access_token" in response.cookies
    assert "refresh_token" in response.cookies


@pytest.mark.django_db
def test_refresh_rotates_access_token(user_factory):
    user_factory(email="admin@example.com")
    client = APIClient()
    login_response = client.post("/api/auth/login/", {"email": "admin@example.com", "password": "password123!"}, format="json")
    client.cookies = login_response.cookies

    response = client.post("/api/auth/refresh/", {}, format="json")

    assert response.status_code == 200
    assert "access_token" in response.cookies


@pytest.mark.django_db
def test_logout_clears_auth_cookies(user_factory):
    user_factory(email="admin@example.com")
    client = APIClient()
    login_response = client.post("/api/auth/login/", {"email": "admin@example.com", "password": "password123!"}, format="json")
    client.cookies = login_response.cookies

    response = client.post("/api/auth/logout/", {}, format="json")

    assert response.status_code == 204
    assert response.cookies["access_token"].value == ""
    assert response.cookies["refresh_token"].value == ""
