from django.conf import settings
from django.db import models

from apps.core.models import TimestampedModel


class Achievement(TimestampedModel):
    class Category(models.TextChoices):
        PROJECT = "project", "Projekt"
        PUBLICATION = "publication", "Publikacja"
        CONFERENCE = "conference", "Konferencja"
        CERTIFICATE = "certificate", "Certyfikat"
        SKILL = "skill", "Kompetencja"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="achievements")
    project = models.ForeignKey("projects.Project", on_delete=models.SET_NULL, null=True, blank=True, related_name="achievements")
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=32, choices=Category.choices)
    description = models.TextField(blank=True)
    issued_at = models.DateField(null=True, blank=True)

