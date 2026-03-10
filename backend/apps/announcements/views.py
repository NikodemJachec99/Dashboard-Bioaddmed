from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.response import Response

from apps.announcements.models import Announcement
from apps.announcements.serializers import AnnouncementSerializer
from apps.projects.models import ProjectMembership


class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.all().select_related("author")
    serializer_class = AnnouncementSerializer
    filterset_fields = ["audience_type", "is_pinned"]
    search_fields = ["title", "content"]

    def get_queryset(self):
        now = timezone.now()
        queryset = super().get_queryset().filter(start_at__lte=now).filter(Q(expires_at__isnull=True) | Q(expires_at__gte=now))
        user = self.request.user
        if getattr(user, "global_role", None) == "admin":
            return queryset
        is_coordinator = ProjectMembership.objects.filter(
            user=user,
            project_role=ProjectMembership.Role.COORDINATOR,
            is_active=True,
        ).exists()
        if is_coordinator:
            return queryset.exclude(audience_type=Announcement.AudienceType.ADMINS)
        return queryset.exclude(audience_type=Announcement.AudienceType.ADMINS).exclude(
            audience_type=Announcement.AudienceType.COORDINATORS
        )

    def create(self, request, *args, **kwargs):
        if getattr(request.user, "global_role", None) != "admin":
            return Response({"detail": "Tylko admin może publikować ogłoszenia."}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if getattr(request.user, "global_role", None) != "admin":
            return Response({"detail": "Brak uprawnień."}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if getattr(request.user, "global_role", None) != "admin":
            return Response({"detail": "Brak uprawnień."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
