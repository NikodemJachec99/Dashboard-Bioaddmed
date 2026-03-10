from rest_framework import viewsets

from apps.achievements.models import Achievement
from apps.achievements.serializers import AchievementSerializer


class AchievementViewSet(viewsets.ModelViewSet):
    queryset = Achievement.objects.all().select_related("user", "project")
    serializer_class = AchievementSerializer
    filterset_fields = ["user", "project", "category"]
    search_fields = ["title", "description"]

