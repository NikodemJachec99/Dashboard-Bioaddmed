from apps.audit.models import ActivityLog


def log_activity(*, user, action_type: str, entity_type: str, entity_id: str, description: str, metadata=None):
    ActivityLog.objects.create(
        user=user,
        action_type=action_type,
        entity_type=entity_type,
        entity_id=str(entity_id),
        description=description,
        metadata_json=metadata or {},
    )

