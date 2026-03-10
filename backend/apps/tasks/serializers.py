from rest_framework import serializers

from apps.tasks.models import KanbanBoard, KanbanColumn, Task, TaskChecklistItem, TaskComment, TaskTag


class TaskTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskTag
        fields = ["id", "name", "color"]


class TaskChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskChecklistItem
        fields = ["id", "content", "is_done", "order", "created_at", "updated_at"]


class TaskCommentSerializer(serializers.ModelSerializer):
    author_email = serializers.CharField(source="author.email", read_only=True)

    class Meta:
        model = TaskComment
        fields = ["id", "author", "author_email", "content", "created_at", "updated_at"]
        read_only_fields = ["author"]


class TaskSerializer(serializers.ModelSerializer):
    assignee_email = serializers.CharField(source="assignee.email", read_only=True)
    tags = TaskTagSerializer(many=True, read_only=True)
    comments = TaskCommentSerializer(many=True, read_only=True)
    checklist_items = TaskChecklistItemSerializer(many=True, read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "project",
            "column",
            "title",
            "description",
            "status",
            "priority",
            "assignee",
            "assignee_email",
            "created_by",
            "due_date",
            "estimated_hours",
            "actual_hours",
            "order",
            "completed_at",
            "tags",
            "is_blocker",
            "comments",
            "checklist_items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "completed_at", "tags", "comments", "checklist_items"]


class KanbanColumnSerializer(serializers.ModelSerializer):
    tasks = TaskSerializer(many=True, read_only=True)

    class Meta:
        model = KanbanColumn
        fields = ["id", "name", "order", "color", "tasks"]


class KanbanBoardSerializer(serializers.ModelSerializer):
    columns = KanbanColumnSerializer(many=True, read_only=True)

    class Meta:
        model = KanbanBoard
        fields = ["id", "name", "project", "columns", "created_at", "updated_at"]

