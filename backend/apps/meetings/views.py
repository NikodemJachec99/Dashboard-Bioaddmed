from django.utils import timezone
from rest_framework.exceptions import PermissionDenied
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.audit.services import log_activity
from apps.meetings.models import Meeting, MeetingActionItem, MeetingParticipant
from apps.meetings.serializers import MeetingActionItemSerializer, MeetingParticipantSerializer, MeetingSerializer
from apps.notifications.services import create_in_app_notification
from apps.meetings.services import generate_tasks_from_action_items
from apps.projects.permissions import is_project_coordinator, is_project_coordinator_by_id, is_project_member_by_id


class MeetingViewSet(viewsets.ModelViewSet):
    queryset = Meeting.objects.all().select_related("related_project", "organizer")
    serializer_class = MeetingSerializer
    filterset_fields = ["meeting_type", "status", "related_project"]
    search_fields = ["title", "description", "agenda", "notes"]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if getattr(user, "global_role", None) == "admin":
            return queryset
        return (
            queryset.filter(related_project__isnull=True)
            | queryset.filter(
                related_project__memberships__user=user,
                related_project__memberships__is_active=True,
            )
        ).distinct()

    def perform_create(self, serializer):
        project = serializer.validated_data.get("related_project")
        if project and not is_project_coordinator(self.request.user, project):
            raise PermissionDenied("Brak uprawnień do tworzenia spotkań dla tego projektu.")
        if not project and getattr(self.request.user, "global_role", None) != "admin":
            raise PermissionDenied("Tylko admin może tworzyć spotkania globalne.")
        meeting = serializer.save(organizer=self.request.user)
        log_activity(
            user=self.request.user,
            action_type="meeting.created",
            entity_type="meeting",
            entity_id=meeting.id,
            description=f"Utworzono spotkanie {meeting.title}.",
        )

    def create(self, request, *args, **kwargs):
        project_id = request.data.get("related_project")
        if project_id and not is_project_coordinator_by_id(request.user, project_id):
            return Response({"detail": "Brak uprawnień."}, status=status.HTTP_403_FORBIDDEN)
        if not project_id and getattr(request.user, "global_role", None) != "admin":
            return Response({"detail": "Tylko admin może tworzyć spotkania globalne."}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        meeting = self.get_object()
        if meeting.related_project and not is_project_coordinator(request.user, meeting.related_project):
            return Response({"detail": "Brak uprawnień."}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        meeting = self.get_object()
        if meeting.related_project and not is_project_coordinator(request.user, meeting.related_project):
            return Response({"detail": "Brak uprawnień."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        meeting = self.get_object()
        if meeting.related_project and not is_project_coordinator(request.user, meeting.related_project):
            return Response({"detail": "Brak uprawnień."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["get", "post"], url_path="participants")
    def participants(self, request, pk=None):
        meeting = self.get_object()
        if meeting.related_project and not is_project_member_by_id(request.user, meeting.related_project_id):
            return Response({"detail": "Brak dostępu do spotkania."}, status=status.HTTP_403_FORBIDDEN)
        if request.method == "GET":
            return Response(MeetingParticipantSerializer(meeting.participants.all(), many=True).data)
        if meeting.related_project and not is_project_coordinator(request.user, meeting.related_project):
            return Response({"detail": "Brak uprawnień."}, status=status.HTTP_403_FORBIDDEN)
        serializer = MeetingParticipantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        participant = serializer.save(meeting=meeting)
        create_in_app_notification(
            user=participant.user,
            title="Zaproszenie na spotkanie",
            message=f"Zostales dodany do spotkania '{meeting.title}'.",
            url="/calendar",
        )
        return Response(MeetingParticipantSerializer(participant).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="attendance")
    def attendance(self, request, pk=None):
        meeting = self.get_object()
        if meeting.related_project and not is_project_member_by_id(request.user, meeting.related_project_id):
            return Response({"detail": "Brak dostępu do spotkania."}, status=status.HTTP_403_FORBIDDEN)
        participant = MeetingParticipant.objects.get(meeting=meeting, user=request.user)
        participant.attendance_status = request.data.get("attendance_status", participant.attendance_status)
        participant.presence_confirmed_at = timezone.now()
        participant.save(update_fields=["attendance_status", "presence_confirmed_at", "updated_at"])
        return Response(MeetingParticipantSerializer(participant).data)

    @action(detail=True, methods=["get", "post"], url_path="action-items")
    def action_items(self, request, pk=None):
        meeting = self.get_object()
        if meeting.related_project and not is_project_member_by_id(request.user, meeting.related_project_id):
            return Response({"detail": "Brak dostępu do spotkania."}, status=status.HTTP_403_FORBIDDEN)
        if request.method == "GET":
            return Response(MeetingActionItemSerializer(meeting.action_items.all(), many=True).data)
        if meeting.related_project and not is_project_coordinator(request.user, meeting.related_project):
            return Response({"detail": "Brak uprawnień."}, status=status.HTTP_403_FORBIDDEN)
        serializer = MeetingActionItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(meeting=meeting)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="generate-tasks")
    def generate_tasks(self, request, pk=None):
        meeting = self.get_object()
        if meeting.related_project and not is_project_coordinator(request.user, meeting.related_project):
            return Response({"detail": "Brak uprawnień."}, status=status.HTTP_403_FORBIDDEN)
        tasks = generate_tasks_from_action_items(meeting, request.user)
        return Response({"created_tasks": [task.id for task in tasks]})
