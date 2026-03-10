from celery import shared_task
from django.utils import timezone

from apps.notifications.models import Notification
from apps.tasks.models import Task


@shared_task
def flag_overdue_tasks():
    today = timezone.localdate()
    overdue_tasks = Task.objects.filter(due_date__lt=today).exclude(status=Task.Status.DONE)
    for task in overdue_tasks.select_related("assignee", "project"):
        if task.assignee:
            Notification.objects.get_or_create(
                user=task.assignee,
                title="Task po terminie",
                message=f"Zadanie '{task.title}' jest po terminie.",
                url=f"/projects/{task.project.slug}",
            )

