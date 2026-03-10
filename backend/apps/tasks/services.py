from django.db import transaction
from django.utils import timezone

from apps.audit.services import log_activity
from apps.notifications.models import Notification
from apps.tasks.models import Task


@transaction.atomic
def move_task(*, task: Task, column, order: int, user):
    task.column = column
    task.order = order
    if column:
        normalized = column.name.lower().replace(" ", "_")
        status_mapping = {
            "backlog": Task.Status.BACKLOG,
            "to_do": Task.Status.TODO,
            "in_progress": Task.Status.IN_PROGRESS,
            "review": Task.Status.REVIEW,
            "done": Task.Status.DONE,
            "blocked": Task.Status.BLOCKED,
        }
        if normalized in status_mapping:
            task.status = status_mapping[normalized]
    if task.status == Task.Status.DONE and task.completed_at is None:
        task.completed_at = timezone.now()
    task.save()
    log_activity(
        user=user,
        action_type="task.moved",
        entity_type="task",
        entity_id=task.id,
        description=f"Przeniesiono task {task.title}.",
    )
    return task


def notify_task_assignment(task: Task):
    if task.assignee:
        Notification.objects.create(
            user=task.assignee,
            title="Przypisano Ci zadanie",
            message=f"Task '{task.title}' został przypisany do Ciebie.",
            url=f"/projects/{task.project.slug}",
        )

