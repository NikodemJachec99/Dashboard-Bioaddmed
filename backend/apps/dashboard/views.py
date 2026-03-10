from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework import serializers
from rest_framework.response import Response

from apps.accounts.models import User
from apps.announcements.models import Announcement
from apps.meetings.models import Meeting
from apps.notifications.models import Notification
from apps.projects.models import Project, ProjectMembership
from apps.tasks.models import Task
from apps.voting.models import VotePoll


class DashboardViewSet(viewsets.ViewSet):
    serializer_class = serializers.Serializer

    @action(detail=False, methods=["get"], url_path="overview")
    def overview(self, request):
        today = timezone.now()
        return Response(
            {
                "active_projects": Project.objects.exclude(status=Project.Status.ARCHIVED).count(),
                "members": ProjectMembership.objects.values("user").distinct().count(),
                "my_tasks": Task.objects.filter(assignee=request.user).exclude(status=Task.Status.DONE).count(),
                "upcoming_meetings": Meeting.objects.filter(start_at__gte=today).count(),
                "active_polls": VotePoll.objects.filter(status=VotePoll.Status.ACTIVE).count(),
                "announcements": Announcement.objects.count(),
            }
        )

    @action(detail=False, methods=["get"], url_path="my-summary")
    def my_summary(self, request):
        today = timezone.localdate()
        return Response(
            {
                "today_tasks": Task.objects.filter(assignee=request.user, due_date=today).count(),
                "week_tasks": Task.objects.filter(assignee=request.user).exclude(status=Task.Status.DONE).count(),
                "meetings": Meeting.objects.filter(participants__user=request.user).count(),
                "notifications": Notification.objects.filter(user=request.user, is_read=False).count(),
            }
        )

    @action(detail=False, methods=["get"], url_path="admin-summary")
    def admin_summary(self, request):
        if getattr(request.user, "global_role", None) != "admin":
            raise PermissionDenied("Brak uprawnień do podsumowania administracyjnego.")
        return Response(
            {
                "projects_at_risk": Project.objects.filter(status=Project.Status.AT_RISK).count(),
                "overdue_tasks": Task.objects.exclude(status=Task.Status.DONE).filter(due_date__lt=timezone.localdate()).count(),
                "blocked_tasks": Task.objects.filter(Q(status=Task.Status.BLOCKED) | Q(is_blocker=True)).count(),
                "members_without_project": User.objects.exclude(project_memberships__is_active=True).count(),
            }
        )

    @action(detail=False, methods=["get"], url_path="project-health")
    def project_health(self, request):
        queryset = Project.objects.annotate(
            member_count=Count("memberships", filter=Q(memberships__is_active=True)),
            task_count=Count("tasks"),
        )
        payload = [
            {
                "id": project.id,
                "name": project.name,
                "status": project.status,
                "stage": project.stage,
                "progress_percent": project.progress_percent,
                "member_count": project.member_count,
                "task_count": project.task_count,
            }
            for project in queryset
        ]
        return Response(payload)
