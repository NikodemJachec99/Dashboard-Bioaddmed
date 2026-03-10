from django.contrib import admin

from apps.audit.models import ActivityLog


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "user", "action_type", "entity_type", "entity_id")
    search_fields = ("description", "entity_type", "entity_id", "user__email")

