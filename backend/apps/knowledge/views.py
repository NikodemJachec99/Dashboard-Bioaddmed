from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.response import Response

from apps.knowledge.models import KnowledgeArticle
from apps.knowledge.serializers import KnowledgeArticleSerializer
from apps.projects.permissions import is_project_coordinator_by_id


class KnowledgeArticleViewSet(viewsets.ModelViewSet):
    queryset = KnowledgeArticle.objects.all().select_related("author", "related_project")
    serializer_class = KnowledgeArticleSerializer
    filterset_fields = ["category", "visibility", "related_project", "is_pinned"]
    search_fields = ["title", "content", "slug"]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if getattr(user, "global_role", None) == "admin":
            return queryset
        return queryset.filter(
            Q(related_project__isnull=False, related_project__memberships__user=user, related_project__memberships__is_active=True)
            | Q(related_project__isnull=True, visibility=KnowledgeArticle.Visibility.INTERNAL)
        ).distinct()

    def create(self, request, *args, **kwargs):
        project_id = request.data.get("related_project")
        if project_id and not is_project_coordinator_by_id(request.user, project_id):
            return Response({"detail": "Brak uprawnień do publikacji w tym projekcie."}, status=status.HTTP_403_FORBIDDEN)
        if not project_id and getattr(request.user, "global_role", None) != "admin":
            return Response({"detail": "Tylko admin może tworzyć globalne artykuły."}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        article = self.get_object()
        if article.related_project_id and not is_project_coordinator_by_id(request.user, article.related_project_id):
            return Response({"detail": "Brak uprawnień."}, status=status.HTTP_403_FORBIDDEN)
        if not article.related_project_id and getattr(request.user, "global_role", None) != "admin":
            return Response({"detail": "Brak uprawnień."}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        article = self.get_object()
        if article.related_project_id and not is_project_coordinator_by_id(request.user, article.related_project_id):
            return Response({"detail": "Brak uprawnień."}, status=status.HTTP_403_FORBIDDEN)
        if not article.related_project_id and getattr(request.user, "global_role", None) != "admin":
            return Response({"detail": "Brak uprawnień."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
