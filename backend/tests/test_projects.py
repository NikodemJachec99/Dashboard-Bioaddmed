import pytest
from rest_framework.test import APIClient

from apps.projects.models import ProjectMembership


@pytest.mark.django_db
def test_project_create_creates_coordinator_membership(user_factory):
    user = user_factory(global_role="admin")
    client = APIClient()
    client.force_authenticate(user)
    response = client.post(
        "/api/projects/",
        {
            "name": "Projekt testowy",
            "slug": "projekt-testowy",
            "short_description": "Opis",
            "category": "research",
        },
        format="json",
    )
    assert response.status_code == 201
    assert ProjectMembership.objects.filter(project_id=response.data["id"], user=user).exists()

