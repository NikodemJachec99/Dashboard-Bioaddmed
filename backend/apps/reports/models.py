from django.conf import settings
from django.db import models

from apps.core.models import TimestampedModel


class ReportSnapshot(TimestampedModel):
    report_type = models.CharField(max_length=80)
    generated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="generated_reports")
    parameters_json = models.JSONField(default=dict, blank=True)
    file_path = models.CharField(max_length=255)

