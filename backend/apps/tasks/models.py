from django.conf import settings
from django.db import models

from apps.core.models import TimestampedModel


class KanbanBoard(TimestampedModel):
    project = models.OneToOneField("projects.Project", on_delete=models.CASCADE, related_name="board")
    name = models.CharField(max_length=120)


class KanbanColumn(TimestampedModel):
    board = models.ForeignKey(KanbanBoard, on_delete=models.CASCADE, related_name="columns")
    name = models.CharField(max_length=120)
    order = models.PositiveIntegerField(default=0)
    color = models.CharField(max_length=20, default="#3b82f6")

    class Meta:
        ordering = ["order", "id"]


class TaskTag(TimestampedModel):
    name = models.CharField(max_length=80, unique=True)
    color = models.CharField(max_length=20, default="#14b8a6")


class Task(TimestampedModel):
    class Status(models.TextChoices):
        BACKLOG = "backlog", "Backlog"
        TODO = "todo", "To Do"
        IN_PROGRESS = "in_progress", "In Progress"
        REVIEW = "review", "Review"
        DONE = "done", "Done"
        BLOCKED = "blocked", "Blocked"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="tasks")
    column = models.ForeignKey(KanbanColumn, on_delete=models.SET_NULL, null=True, blank=True, related_name="tasks")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.TODO)
    priority = models.CharField(max_length=32, choices=Priority.choices, default=Priority.MEDIUM)
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tasks",
    )
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_tasks")
    due_date = models.DateField(null=True, blank=True)
    estimated_hours = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    actual_hours = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    completed_at = models.DateTimeField(null=True, blank=True)
    tags = models.ManyToManyField(TaskTag, blank=True, related_name="tasks")
    is_blocker = models.BooleanField(default=False)

    class Meta:
        ordering = ["order", "-created_at"]


class TaskComment(TimestampedModel):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="task_comments")
    content = models.TextField()


class TaskChecklistItem(TimestampedModel):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="checklist_items")
    content = models.CharField(max_length=255)
    is_done = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

