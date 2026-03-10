from rest_framework import serializers

from apps.knowledge.models import KnowledgeArticle


class KnowledgeArticleSerializer(serializers.ModelSerializer):
    author_email = serializers.CharField(source="author.email", read_only=True)

    class Meta:
        model = KnowledgeArticle
        fields = [
            "id",
            "title",
            "slug",
            "content",
            "category",
            "visibility",
            "related_project",
            "author",
            "author_email",
            "is_pinned",
            "version",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["author", "version"]

