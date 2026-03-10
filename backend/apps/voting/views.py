from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminUserExtended
from apps.audit.services import log_activity
from apps.voting.models import VoteOption, VotePoll
from apps.voting.serializers import VoteOptionSerializer, VotePollSerializer
from apps.voting.services import build_results, can_vote, cast_vote, close_poll


class PollViewSet(viewsets.ModelViewSet):
    queryset = VotePoll.objects.all().select_related("author", "related_project").prefetch_related("options", "eligible_users")
    serializer_class = VotePollSerializer
    filterset_fields = ["poll_type", "audience_type", "status", "visibility_type", "related_project"]
    search_fields = ["title", "description"]

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy", "close", "create_option"}:
            return [IsAdminUserExtended()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        poll = serializer.save(author=self.request.user)
        log_activity(
            user=self.request.user,
            action_type="poll.created",
            entity_type="poll",
            entity_id=poll.id,
            description=f"Utworzono głosowanie {poll.title}.",
        )

    @action(detail=True, methods=["post"], url_path="options")
    def create_option(self, request, pk=None):
        poll = self.get_object()
        serializer = VoteOptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(poll=poll)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="vote")
    def vote(self, request, pk=None):
        poll = self.get_object()
        if not can_vote(request.user, poll):
            return Response({"detail": "Brak możliwości oddania głosu."}, status=status.HTTP_403_FORBIDDEN)
        option_ids = request.data.get("option_ids", [])
        try:
            ballots = cast_vote(poll=poll, user=request.user, option_ids=option_ids)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"ballots": [ballot.id for ballot in ballots]}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="results")
    def results(self, request, pk=None):
        poll = self.get_object()
        return Response(build_results(poll))

    @action(detail=True, methods=["post"], url_path="close")
    def close(self, request, pk=None):
        poll = self.get_object()
        close_poll(poll, request.user)
        return Response(VotePollSerializer(poll).data)
