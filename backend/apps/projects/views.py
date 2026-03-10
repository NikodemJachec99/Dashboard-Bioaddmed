from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.audit.models import ActivityLog
from apps.audit.services import log_activity
from apps.projects.models import (
    Project,
    ProjectLink,
    ProjectMembership,
    ProjectMilestone,
    ProjectRisk,
    RecruitmentOpening,
)
from apps.projects.permissions import is_project_coordinator
from apps.projects.serializers import (
    ProjectLinkSerializer,
    ProjectMembershipSerializer,
    ProjectMilestoneSerializer,
    ProjectRiskSerializer,
    ProjectSerializer,
    RecruitmentApplicationSerializer,
    RecruitmentOpeningSerializer,
)
from apps.projects.services import archive_project, create_default_board
from apps.tasks.models import KanbanBoard, Task
from apps.tasks.serializers import KanbanBoardSerializer, TaskSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = (
        Project.objects.all()
        .select_related("created_by")
        .prefetch_related("memberships__user", "links", "milestones", "risks", "recruitment_openings")
    )
    serializer_class = ProjectSerializer
    search_fields = ["name", "slug", "short_description", "full_description"]
    filterset_fields = ["category", "stage", "status"]

    def perform_create(self, serializer):
        if getattr(self.request.user, "global_role", None) != "admin":
            raise PermissionError("Tylko admin może tworzyć projekty.")
        project = serializer.save(created_by=self.request.user)
        ProjectMembership.objects.get_or_create(
            project=project,
            user=self.request.user,
            defaults={"project_role": ProjectMembership.Role.COORDINATOR},
        )
        create_default_board(project, self.request.user)
        log_activity(
            user=self.request.user,
            action_type="project.created",
            entity_type="project",
            entity_id=project.id,
            description=f"Utworzono projekt {project.name}.",
        )

    def get_queryset(self):
        # Każdy zalogowany użytkownik widzi statusy i listę wszystkich projektów.
        # Uprawnienia do zmian pozostają kontrolowane akcjami i helperem _ensure_manage_access.
        return super().get_queryset()

    def create(self, request, *args, **kwargs):
        if getattr(request.user, "global_role", None) != "admin":
            return Response({"detail": "Tylko admin może tworzyć projekty."}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def _ensure_manage_access(self, request, project):
        if not is_project_coordinator(request.user, project):
            return Response({"detail": "Brak uprawnień."}, status=status.HTTP_403_FORBIDDEN)
        return None

    @action(detail=True, methods=["get"], url_path="overview")
    def overview(self, request, pk=None):
        project = self.get_object()
        counts = Task.objects.filter(project=project).aggregate(
            total_tasks=Count("id"),
            completed=Count("id", filter=Q(status="done")),
            overdue=Count("id", filter=Q(due_date__lt=timezone.localdate()) & ~Q(status="done")),
        )
        return Response(
            {
                "project": ProjectSerializer(project).data,
                "stats": {
                    **counts,
                    "members": project.memberships.filter(is_active=True).count(),
                    "meetings": project.meetings.count(),
                    "open_risks": project.risks.exclude(status="closed").count(),
                },
            }
        )

    @action(detail=True, methods=["get"], url_path="activity")
    def activity(self, request, pk=None):
        logs = ActivityLog.objects.filter(entity_type="project", entity_id=str(pk))[:50]
        payload = [
            {
                "id": item.id,
                "action_type": item.action_type,
                "description": item.description,
                "created_at": item.created_at,
            }
            for item in logs
        ]
        return Response(payload)

    @action(detail=True, methods=["post"], url_path="archive")
    def archive(self, request, pk=None):
        project = self.get_object()
        if not is_project_coordinator(request.user, project):
            return Response({"detail": "Brak uprawnień."}, status=status.HTTP_403_FORBIDDEN)
        archive_project(project, request.user)
        return Response(ProjectSerializer(project).data)

    @action(detail=True, methods=["get"], url_path="board")
    def board(self, request, pk=None):
        board = KanbanBoard.objects.filter(project_id=pk).first()
        if not board:
            return Response({"detail": "Board nie istnieje."}, status=status.HTTP_404_NOT_FOUND)
        return Response(KanbanBoardSerializer(board).data)

    @action(detail=True, methods=["get", "post"], url_path="members")
    def members(self, request, pk=None):
        project = self.get_object()
        if request.method == "GET":
            return Response(ProjectMembershipSerializer(project.memberships.select_related("user"), many=True).data)
        denied = self._ensure_manage_access(request, project)
        if denied:
            return denied
        serializer = ProjectMembershipSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(project=project)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch", "delete"], url_path=r"members/(?P<membership_id>[^/.]+)")
    def member_detail(self, request, pk=None, membership_id=None):
        project = self.get_object()
        denied = self._ensure_manage_access(request, project)
        if denied:
            return denied
        membership = ProjectMembership.objects.get(pk=membership_id, project_id=pk)
        if request.method == "PATCH":
            serializer = ProjectMembershipSerializer(membership, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get", "post"], url_path="links")
    def links(self, request, pk=None):
        project = self.get_object()
        if request.method == "GET":
            return Response(ProjectLinkSerializer(project.links.all(), many=True).data)
        denied = self._ensure_manage_access(request, project)
        if denied:
            return denied
        serializer = ProjectLinkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(project=project)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="milestones")
    def milestones(self, request, pk=None):
        project = self.get_object()
        if request.method == "GET":
            return Response(ProjectMilestoneSerializer(project.milestones.all(), many=True).data)
        denied = self._ensure_manage_access(request, project)
        if denied:
            return denied
        serializer = ProjectMilestoneSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(project=project)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="risks")
    def risks(self, request, pk=None):
        project = self.get_object()
        if request.method == "GET":
            return Response(ProjectRiskSerializer(project.risks.all(), many=True).data)
        denied = self._ensure_manage_access(request, project)
        if denied:
            return denied
        serializer = ProjectRiskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(project=project)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="tasks")
    def tasks(self, request, pk=None):
        project = self.get_object()
        if request.method == "GET":
            queryset = Task.objects.filter(project=project).select_related("assignee", "column")
            return Response(TaskSerializer(queryset, many=True).data)
        denied = self._ensure_manage_access(request, project)
        if denied:
            return denied
        payload = request.data.copy()
        payload["project"] = project.id
        serializer = TaskSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        serializer.save(project=project, created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="recruitment")
    def recruitment(self, request, pk=None):
        project = self.get_object()
        if request.method == "GET":
            return Response(RecruitmentOpeningSerializer(project.recruitment_openings.all(), many=True).data)
        denied = self._ensure_manage_access(request, project)
        if denied:
            return denied
        serializer = RecruitmentOpeningSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(project=project)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path=r"recruitment/(?P<opening_id>[^/.]+)/apply")
    def apply_recruitment(self, request, pk=None, opening_id=None):
        opening = RecruitmentOpening.objects.get(pk=opening_id, project_id=pk)
        serializer = RecruitmentApplicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(opening=opening, applicant=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
