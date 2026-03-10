from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.accounts.models import User
from apps.announcements.models import Announcement
from apps.meetings.models import Meeting
from apps.notifications.models import Notification
from apps.projects.models import Project, ProjectMembership
from apps.tasks.models import Task
from apps.voting.models import VotePoll
from apps.dashboard.services import calculate_project_health, serialize_project_health


class DashboardViewSet(viewsets.ViewSet):
    serializer_class = serializers.Serializer

    @action(detail=False, methods=["get"], url_path="overview")
    def overview(self, request):
        today = timezone.now()
        projects = Project.objects.exclude(status=Project.Status.ARCHIVED)
        health_snapshots = [calculate_project_health(project) for project in projects]
        projects_needing_attention = [snapshot for snapshot in health_snapshots if snapshot.health_score < 70]
        critical_projects = [snapshot for snapshot in health_snapshots if snapshot.health_score < 50]
        return Response(
            {
                "active_projects": projects.count(),
                "members": ProjectMembership.objects.values("user").distinct().count(),
                "my_tasks": Task.objects.filter(assignee=request.user).exclude(status=Task.Status.DONE).count(),
                "upcoming_meetings": Meeting.objects.filter(start_at__gte=today).count(),
                "active_polls": VotePoll.objects.filter(status=VotePoll.Status.ACTIVE).count(),
                "announcements": Announcement.objects.count(),
                "projects_needing_attention": len(projects_needing_attention),
                "critical_projects": len(critical_projects),
                "unread_notifications": Notification.objects.filter(user=request.user, is_read=False).count(),
                "portfolio_health_score": int(sum(snapshot.health_score for snapshot in health_snapshots) / len(health_snapshots)) if health_snapshots else 100,
            }
        )

    @action(detail=False, methods=["get"], url_path="my-summary")
    def my_summary(self, request):
        today = timezone.localdate()
        my_tasks = Task.objects.filter(assignee=request.user).exclude(status=Task.Status.DONE)
        return Response(
            {
                "today_tasks": my_tasks.filter(due_date=today).count(),
                "week_tasks": my_tasks.count(),
                "meetings": Meeting.objects.filter(participants__user=request.user).count(),
                "notifications": Notification.objects.filter(user=request.user, is_read=False).count(),
                "overdue_tasks": my_tasks.filter(due_date__lt=today).count(),
                "blockers": my_tasks.filter(Q(status=Task.Status.BLOCKED) | Q(is_blocker=True)).count(),
            }
        )

    @action(detail=False, methods=["get"], url_path="admin-summary")
    def admin_summary(self, request):
        if getattr(request.user, "global_role", None) != "admin":
            raise PermissionDenied("Brak uprawnień do podsumowania administracyjnego.")
        projects = Project.objects.exclude(status=Project.Status.ARCHIVED)
        health_snapshots = [calculate_project_health(project) for project in projects]
        worst_score = min((snapshot.health_score for snapshot in health_snapshots), default=100)
        return Response(
            {
                "projects_at_risk": Project.objects.filter(status=Project.Status.AT_RISK).count(),
                "overdue_tasks": Task.objects.exclude(status=Task.Status.DONE).filter(due_date__lt=timezone.localdate()).count(),
                "blocked_tasks": Task.objects.filter(Q(status=Task.Status.BLOCKED) | Q(is_blocker=True)).count(),
                "members_without_project": User.objects.exclude(project_memberships__is_active=True).count(),
                "critical_projects": len([snapshot for snapshot in health_snapshots if snapshot.health_score < 50]),
                "portfolio_health_score": int(sum(snapshot.health_score for snapshot in health_snapshots) / len(health_snapshots)) if health_snapshots else 100,
                "worst_health_score": worst_score,
            }
        )

    @action(detail=False, methods=["get"], url_path="project-health")
    def project_health(self, request):
        snapshots = [calculate_project_health(project) for project in Project.objects.exclude(status=Project.Status.ARCHIVED)]
        payload = [serialize_project_health(snapshot) for snapshot in sorted(snapshots, key=lambda snapshot: snapshot.health_score)]
        return Response(payload)
