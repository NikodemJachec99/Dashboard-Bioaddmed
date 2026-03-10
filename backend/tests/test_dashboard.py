import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_dashboard_overview_requires_auth(user_factory):
    user = user_factory()
    client = APIClient()
    client.force_authenticate(user)
    response = client.get("/api/dashboard/overview/")
    assert response.status_code == 200
