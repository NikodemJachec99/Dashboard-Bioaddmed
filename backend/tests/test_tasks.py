import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_move_task_updates_status(user_factory, project_factory, membership_factory, task_factory):
    user = user_factory(global_role="admin")
    project = project_factory(created_by=user)
    membership_factory(user=user, project=project)
    task = task_factory(project=project, created_by=user)
    done_column = task.column.board.columns.create(name="Done", order=10, color="#10b981")
    client = APIClient()
    client.force_authenticate(user)
    response = client.post(f"/api/tasks/{task.id}/move/", {"column": done_column.id, "order": 1}, format="json")
    assert response.status_code == 200
    task.refresh_from_db()
    assert task.status == "done"
