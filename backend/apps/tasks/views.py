from django.contrib.contenttypes.models import ContentType
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.audit.services import log_activity
from apps.core.models import FileAttachment
from apps.core.serializers import FileAttachmentSerializer
from apps.projects.models import ProjectMembership
from apps.tasks.models import KanbanColumn, Task
from apps.tasks.serializers import TaskChecklistItemSerializer, TaskCommentSerializer, TaskSerializer
from apps.tasks.services import move_task, notify_task_assignment


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all().select_related("project", "assignee", "column")
    serializer_class = TaskSerializer
    search_fields = ["title", "description"]
    filterset_fields = ["project", "assignee", "status", "priority", "is_blocker"]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if getattr(user, "global_role", None) == "admin":
            return queryset
        return queryset.filter(
            Q(project__memberships__user=user, project__memberships__is_active=True) | Q(assignee=user)
        ).distinct()

    def create(self, request, *args, **kwargs):
        project_id = request.data.get("project")
        is_coordinator = ProjectMembership.objects.filter(
            user=request.user,
            project_id=project_id,
            project_role=ProjectMembership.Role.COORDINATOR,
            is_active=True,
        ).exists()
        if request.user.global_role != "admin" and not is_coordinator:
            return Response({"detail": "Brak uprawnień do tworzenia tasków w tym projekcie."}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        task = self.get_object()
        previous_assignee_id = task.assignee_id
        is_coordinator = ProjectMembership.objects.filter(
            user=request.user,
            project=task.project,
            project_role=ProjectMembership.Role.COORDINATOR,
            is_active=True,
        ).exists()
        is_admin = request.user.global_role == "admin"
        is_assignee = task.assignee_id == request.user.id
        if not is_admin and not is_assignee and not is_coordinator:
            return Response({"detail": "Brak uprawnień."}, status=status.HTTP_403_FORBIDDEN)
        if not is_admin and not is_coordinator:
            allowed_fields = {"status", "column", "order", "actual_hours"}
            if any(field not in allowed_fields for field in request.data.keys()):
                return Response(
                    {"detail": "Możesz aktualizować tylko status i postęp własnego taska."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        response = super().partial_update(request, *args, **kwargs)
        task.refresh_from_db()
        if task.assignee_id and task.assignee_id != previous_assignee_id:
            notify_task_assignment(task)
        return response

    def destroy(self, request, *args, **kwargs):
        task = self.get_object()
        is_coordinator = ProjectMembership.objects.filter(
            user=request.user,
            project=task.project,
            project_role=ProjectMembership.Role.COORDINATOR,
            is_active=True,
        ).exists()
        if request.user.global_role != "admin" and not is_coordinator:
            return Response({"detail": "Brak uprawnień."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    def perform_create(self, serializer):
        task = serializer.save(created_by=self.request.user)
        notify_task_assignment(task)
        log_activity(
            user=self.request.user,
            action_type="task.created",
            entity_type="task",
            entity_id=task.id,
            description=f"Utworzono task {task.title}.",
        )

    @action(detail=True, methods=["post"], url_path="move")
    def move(self, request, pk=None):
        task = self.get_object()
        is_coordinator = ProjectMembership.objects.filter(
            user=request.user,
            project=task.project,
            project_role=ProjectMembership.Role.COORDINATOR,
            is_active=True,
        ).exists()
        if request.user.global_role != "admin" and task.assignee_id != request.user.id and not is_coordinator:
            return Response({"detail": "Brak uprawnień."}, status=status.HTTP_403_FORBIDDEN)
        column = KanbanColumn.objects.filter(pk=request.data.get("column")).first()
        move_task(task=task, column=column, order=int(request.data.get("order", task.order)), user=request.user)
        return Response(TaskSerializer(task).data)

    @action(detail=True, methods=["get", "post"], url_path="comments")
    def comments(self, request, pk=None):
        task = self.get_object()
        if request.method == "GET":
            return Response(TaskCommentSerializer(task.comments.all(), many=True).data)
        serializer = TaskCommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(task=task, author=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="checklist")
    def checklist(self, request, pk=None):
        task = self.get_object()
        serializer = TaskChecklistItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(task=task)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="attachments")
    def attachments(self, request, pk=None):
        task = self.get_object()
        attachment_queryset = FileAttachment.objects.filter(
            content_type=ContentType.objects.get_for_model(Task),
            object_id=task.id,
        ).select_related("uploaded_by")
        if request.method == "GET":
            serializer = FileAttachmentSerializer(attachment_queryset, many=True, context={"request": request})
            return Response(serializer.data)

        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "Plik jest wymagany."}, status=status.HTTP_400_BAD_REQUEST)
        attachment = FileAttachment.objects.create(
            uploaded_by=request.user,
            file=upload,
            label=request.data.get("label") or upload.name,
            content_object=task,
            metadata_json={"scope": "task", "task_id": task.id, "project_id": task.project_id},
        )
        log_activity(
            user=request.user,
            action_type="task.attachment.created",
            entity_type="task",
            entity_id=task.id,
            description=f"Dodano plik {attachment.label} do taska {task.title}.",
        )
        serializer = FileAttachmentSerializer(attachment, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"attachments/(?P<attachment_id>\d+)")
    def attachment_detail(self, request, pk=None, attachment_id=None):
        task = self.get_object()
        attachment = FileAttachment.objects.filter(
            pk=attachment_id,
            content_type=ContentType.objects.get_for_model(Task),
            object_id=task.id,
        ).select_related("uploaded_by").first()
        if not attachment:
            return Response({"detail": "Plik nie istnieje."}, status=status.HTTP_404_NOT_FOUND)

        is_coordinator = ProjectMembership.objects.filter(
            user=request.user,
            project=task.project,
            project_role=ProjectMembership.Role.COORDINATOR,
            is_active=True,
        ).exists()
        can_delete = request.user.global_role == "admin" or is_coordinator or attachment.uploaded_by_id == request.user.id
        if not can_delete:
            return Response({"detail": "Brak uprawnień."}, status=status.HTTP_403_FORBIDDEN)

        attachment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
