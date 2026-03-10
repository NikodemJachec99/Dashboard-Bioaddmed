from django.db import transaction

from apps.audit.services import log_activity
from apps.projects.models import Project
from apps.tasks.models import KanbanBoard, KanbanColumn


DEFAULT_COLUMNS = [
    ("Backlog", "#64748b"),
    ("To Do", "#3b82f6"),
    ("In Progress", "#06b6d4"),
    ("Review", "#f59e0b"),
    ("Done", "#10b981"),
    ("Blocked", "#ef4444"),
]


@transaction.atomic
def create_default_board(project: Project, user):
    board = KanbanBoard.objects.create(project=project, name=f"{project.name} Board")
    for index, (name, color) in enumerate(DEFAULT_COLUMNS):
        KanbanColumn.objects.create(board=board, name=name, order=index, color=color)
    log_activity(
        user=user,
        action_type="project.board_created",
        entity_type="project",
        entity_id=project.id,
        description=f"Utworzono domyślną tablicę kanban dla projektu {project.name}.",
    )
    return board


def archive_project(project: Project, user):
    project.stage = Project.Stage.ARCHIVED
    project.status = Project.Status.ARCHIVED
    project.save(update_fields=["stage", "status", "updated_at"])
    log_activity(
        user=user,
        action_type="project.archived",
        entity_type="project",
        entity_id=project.id,
        description=f"Projekt {project.name} został zarchiwizowany.",
    )
    return project

