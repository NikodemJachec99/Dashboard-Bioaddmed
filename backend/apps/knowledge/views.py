from rest_framework import viewsets

from apps.knowledge.models import KnowledgeArticle
from apps.knowledge.serializers import KnowledgeArticleSerializer


class KnowledgeArticleViewSet(viewsets.ModelViewSet):
    queryset = KnowledgeArticle.objects.all().select_related("author", "related_project")
    serializer_class = KnowledgeArticleSerializer
    filterset_fields = ["category", "visibility", "related_project", "is_pinned"]
    search_fields = ["title", "content", "slug"]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

