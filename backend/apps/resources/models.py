from django.conf import settings
from django.db import models

from apps.core.models import TimestampedModel


class Resource(TimestampedModel):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=255, blank=True)
    caretaker = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="managed_resources")
    rules = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)


class Reservation(TimestampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        CANCELLED = "cancelled", "Cancelled"

    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name="reservations")
    reserved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reservations")
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    purpose = models.TextField(blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PENDING)

