from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from django.db.models import Max
from django.utils import timezone

from apps.audit.models import ActivityLog
from apps.projects.models import Project, ProjectMembership
from apps.tasks.models import Task


@dataclass
class ProjectHealthSnapshot:
    id: int
    name: str
    slug: str
    status: str
    stage: str
    progress_percent: int
    member_count: int
    task_count: int
    overdue_tasks: int
    blocker_count: int
    open_risks: int
    overdue_milestones: int
    coordinators: int
    health_score: int
    health_label: str
    attention_level: str
    recent_activity_days: int | None
    last_activity_at: datetime | None


def _days_since(value: datetime | None):
    if not value:
        return None
    delta = timezone.now() - value
    return max(delta.days, 0)


def _health_label(score: int):
    if score >= 85:
        return "Stabilny i dobrze prowadzony"
    if score >= 70:
        return "Dobry, ale wymaga uwagi operacyjnej"
    if score >= 50:
        return "Napiecie delivery jest podwyzszone"
    return "Wymaga natychmiastowej interwencji"


def _attention_level(score: int):
    if score >= 85:
        return "low"
    if score >= 70:
        return "medium"
    if score >= 50:
        return "high"
    return "critical"


def calculate_project_health(project: Project) -> ProjectHealthSnapshot:
    today = timezone.localdate()
    member_count = project.memberships.filter(is_active=True).count()
    coordinators = project.memberships.filter(is_active=True, project_role=ProjectMembership.Role.COORDINATOR).count()
    task_queryset = project.tasks.all()
    task_count = task_queryset.count()
    overdue_tasks = task_queryset.exclude(status=Task.Status.DONE).filter(due_date__lt=today).count()
    blocker_count = task_queryset.filter(is_blocker=True).count() + task_queryset.filter(status=Task.Status.BLOCKED).count()
    open_risks = project.risks.exclude(status="closed").count()
    overdue_milestones = project.milestones.exclude(status="completed").filter(due_date__lt=today).count()
    last_activity_at = ActivityLog.objects.filter(entity_type="project", entity_id=str(project.id)).aggregate(last=Max("created_at"))["last"]
    recent_activity_days = _days_since(last_activity_at)

    score = 100
    score -= min(overdue_tasks * 9, 32)
    score -= min(blocker_count * 7, 28)
    score -= min(open_risks * 6, 24)
    score -= min(overdue_milestones * 8, 24)
    if coordinators == 0:
        score -= 12
    if member_count == 0:
        score -= 10
    if recent_activity_days is not None and recent_activity_days > 10:
        score -= min((recent_activity_days - 10) * 2, 14)

    if project.status == Project.Status.BLOCKED:
        score -= 25
    elif project.status == Project.Status.AT_RISK:
        score -= 15
    elif project.status == Project.Status.COMPLETED:
        score = max(score, 92)

    if project.progress_percent >= 75:
        score += 4
    elif project.progress_percent <= 25 and task_count > 0:
        score -= 6

    score = max(5, min(int(score), 100))

    return ProjectHealthSnapshot(
        id=project.id,
        name=project.name,
        slug=project.slug,
        status=project.status,
        stage=project.stage,
        progress_percent=project.progress_percent,
        member_count=member_count,
        task_count=task_count,
        overdue_tasks=overdue_tasks,
        blocker_count=blocker_count,
        open_risks=open_risks,
        overdue_milestones=overdue_milestones,
        coordinators=coordinators,
        health_score=score,
        health_label=_health_label(score),
        attention_level=_attention_level(score),
        recent_activity_days=recent_activity_days,
        last_activity_at=last_activity_at,
    )


def serialize_project_health(snapshot: ProjectHealthSnapshot):
    return {
        "id": snapshot.id,
        "name": snapshot.name,
        "slug": snapshot.slug,
        "status": snapshot.status,
        "stage": snapshot.stage,
        "progress_percent": snapshot.progress_percent,
        "member_count": snapshot.member_count,
        "task_count": snapshot.task_count,
        "overdue_tasks": snapshot.overdue_tasks,
        "blocker_count": snapshot.blocker_count,
        "open_risks": snapshot.open_risks,
        "overdue_milestones": snapshot.overdue_milestones,
        "coordinators": snapshot.coordinators,
        "health_score": snapshot.health_score,
        "health_label": snapshot.health_label,
        "attention_level": snapshot.attention_level,
        "recent_activity_days": snapshot.recent_activity_days,
        "last_activity_at": snapshot.last_activity_at,
    }
