from django.conf import settings
from django.db import models

from apps.core.models import TimestampedModel


class Announcement(TimestampedModel):
    class AudienceType(models.TextChoices):
        ALL = "all", "Wszyscy"
        MEMBERS = "members", "Członkowie"
        COORDINATORS = "coordinators", "Koordynatorzy"
        ADMINS = "admins", "Admini"

    title = models.CharField(max_length=255)
    content = models.TextField()
    audience_type = models.CharField(max_length=32, choices=AudienceType.choices, default=AudienceType.ALL)
    start_at = models.DateTimeField()
    expires_at = models.DateTimeField(null=True, blank=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="announcements")
    is_pinned = models.BooleanField(default=False)

