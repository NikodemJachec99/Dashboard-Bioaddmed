from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.audit.services import log_activity
from apps.meetings.models import Meeting, MeetingActionItem, MeetingParticipant
from apps.meetings.serializers import MeetingActionItemSerializer, MeetingParticipantSerializer, MeetingSerializer
from apps.meetings.services import generate_tasks_from_action_items


class MeetingViewSet(viewsets.ModelViewSet):
    queryset = Meeting.objects.all().select_related("related_project", "organizer")
    serializer_class = MeetingSerializer
    filterset_fields = ["meeting_type", "status", "related_project"]
    search_fields = ["title", "description", "agenda", "notes"]

    def perform_create(self, serializer):
        meeting = serializer.save(organizer=self.request.user)
        log_activity(
            user=self.request.user,
            action_type="meeting.created",
            entity_type="meeting",
            entity_id=meeting.id,
            description=f"Utworzono spotkanie {meeting.title}.",
        )

    @action(detail=True, methods=["get", "post"], url_path="participants")
    def participants(self, request, pk=None):
        meeting = self.get_object()
        if request.method == "GET":
            return Response(MeetingParticipantSerializer(meeting.participants.all(), many=True).data)
        serializer = MeetingParticipantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(meeting=meeting)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="attendance")
    def attendance(self, request, pk=None):
        meeting = self.get_object()
        participant = MeetingParticipant.objects.get(meeting=meeting, user=request.user)
        participant.attendance_status = request.data.get("attendance_status", participant.attendance_status)
        participant.presence_confirmed_at = timezone.now()
        participant.save(update_fields=["attendance_status", "presence_confirmed_at", "updated_at"])
        return Response(MeetingParticipantSerializer(participant).data)

    @action(detail=True, methods=["get", "post"], url_path="action-items")
    def action_items(self, request, pk=None):
        meeting = self.get_object()
        if request.method == "GET":
            return Response(MeetingActionItemSerializer(meeting.action_items.all(), many=True).data)
        serializer = MeetingActionItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(meeting=meeting)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="generate-tasks")
    def generate_tasks(self, request, pk=None):
        meeting = self.get_object()
        tasks = generate_tasks_from_action_items(meeting, request.user)
        return Response({"created_tasks": [task.id for task in tasks]})

