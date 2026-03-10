from django.conf import settings
from django.db import models

from apps.core.models import TimestampedModel


class Meeting(TimestampedModel):
    class MeetingType(models.TextChoices):
        GENERAL = "general", "Spotkanie ogólne"
        PROJECT = "project", "Spotkanie projektowe"
        BOARD = "board", "Spotkanie zarządu"
        WORKSHOP = "workshop", "Warsztat"
        CONSULTATION = "consultation", "Konsultacje"
        PRESENTATION = "presentation", "Prezentacja"
        EXTERNAL = "external", "Wydarzenie zewnętrzne"

    class Status(models.TextChoices):
        PLANNED = "planned", "Planned"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    meeting_type = models.CharField(max_length=32, choices=MeetingType.choices)
    related_project = models.ForeignKey(
        "projects.Project",
        on_delete=models.SET_NULL,
        related_name="meetings",
        null=True,
        blank=True,
    )
    organizer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="organized_meetings")
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    location = models.CharField(max_length=255, blank=True)
    online_url = models.URLField(blank=True)
    agenda = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PLANNED)


class MeetingParticipant(TimestampedModel):
    class AttendanceStatus(models.TextChoices):
        INVITED = "invited", "Invited"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        ATTENDED = "attended", "Attended"
        ABSENT = "absent", "Absent"

    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name="participants")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="meeting_participations")
    attendance_status = models.CharField(max_length=32, choices=AttendanceStatus.choices, default=AttendanceStatus.INVITED)
    presence_confirmed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("meeting", "user")


class MeetingActionItem(TimestampedModel):
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name="action_items")
    task = models.ForeignKey("tasks.Task", on_delete=models.SET_NULL, null=True, blank=True, related_name="meeting_action_items")
    description = models.TextField()
    assignee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="meeting_action_items")
    due_date = models.DateField(null=True, blank=True)

