import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_vote_only_once(user_factory, poll_factory, vote_option_factory):
    user = user_factory()
    poll = poll_factory(status="active")
    option = vote_option_factory(poll=poll)
    client = APIClient()
    client.force_authenticate(user)
    first = client.post(f"/api/polls/{poll.id}/vote/", {"option_ids": [option.id]}, format="json")
    second = client.post(f"/api/polls/{poll.id}/vote/", {"option_ids": [option.id]}, format="json")
    assert first.status_code == 201
    assert second.status_code == 400

