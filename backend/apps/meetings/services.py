from apps.audit.services import log_activity
from apps.tasks.models import Task


def generate_tasks_from_action_items(meeting, user):
    created = []
    if not meeting.related_project:
        return created
    default_column = meeting.related_project.board.columns.order_by("order").first()
    for action_item in meeting.action_items.filter(task__isnull=True):
        task = Task.objects.create(
            project=meeting.related_project,
            column=default_column,
            title=action_item.description[:120],
            description=action_item.description,
            assignee=action_item.assignee,
            created_by=user,
            due_date=action_item.due_date,
        )
        action_item.task = task
        action_item.save(update_fields=["task", "updated_at"])
        created.append(task)
    log_activity(
        user=user,
        action_type="meeting.generate_tasks",
        entity_type="meeting",
        entity_id=meeting.id,
        description=f"Wygenerowano taski ze spotkania {meeting.title}.",
        metadata={"count": len(created)},
    )
    return created

