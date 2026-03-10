from django.conf import settings
from django.db import models

from apps.core.models import TimestampedModel


class VotePoll(TimestampedModel):
    class PollType(models.TextChoices):
        SINGLE = "single", "Jednoodpowiedziowe"
        MULTI = "multi", "Wieloodpowiedziowe"
        YES_NO = "yes_no", "Tak/Nie"
        SCALE = "scale", "Skala"
        APPROVAL = "approval", "Zatwierdzenie/Odrzucenie"

    class AudienceType(models.TextChoices):
        GLOBAL = "global", "Ogólnokołowe"
        BOARD = "board", "Zarządowe"
        PROJECT = "project", "Projektowe"
        ADMIN = "admin", "Administracyjne"

    class VisibilityType(models.TextChoices):
        PUBLIC = "public", "Jawne"
        ANONYMOUS = "anonymous", "Anonimowe"

    class ThresholdType(models.TextChoices):
        SIMPLE_MAJORITY = "simple_majority", "Simple Majority"
        SUPERMAJORITY = "supermajority", "Supermajority"
        APPROVAL = "approval", "Approval"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        CLOSED = "closed", "Closed"

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    poll_type = models.CharField(max_length=32, choices=PollType.choices)
    audience_type = models.CharField(max_length=32, choices=AudienceType.choices, default=AudienceType.GLOBAL)
    visibility_type = models.CharField(max_length=32, choices=VisibilityType.choices, default=VisibilityType.PUBLIC)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_polls")
    related_project = models.ForeignKey("projects.Project", on_delete=models.SET_NULL, null=True, blank=True, related_name="polls")
    eligible_users = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name="eligible_polls")
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    quorum_required = models.PositiveIntegerField(default=0)
    threshold_type = models.CharField(max_length=32, choices=ThresholdType.choices, default=ThresholdType.SIMPLE_MAJORITY)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.DRAFT)


class VoteOption(TimestampedModel):
    poll = models.ForeignKey(VotePoll, on_delete=models.CASCADE, related_name="options")
    label = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]


class VoteBallot(TimestampedModel):
    poll = models.ForeignKey(VotePoll, on_delete=models.CASCADE, related_name="ballots")
    voter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ballots")
    option = models.ForeignKey(VoteOption, on_delete=models.CASCADE, related_name="ballots")
    cast_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("poll", "voter", "option")

