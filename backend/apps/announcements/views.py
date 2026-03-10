from rest_framework import viewsets

from apps.announcements.models import Announcement
from apps.announcements.serializers import AnnouncementSerializer


class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.all().select_related("author")
    serializer_class = AnnouncementSerializer
    filterset_fields = ["audience_type", "is_pinned"]
    search_fields = ["title", "content"]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

