from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminUserExtended
from apps.reports.models import ReportSnapshot
from apps.reports.serializers import ReportSnapshotSerializer
from apps.reports.services import generate_report


class ReportSnapshotViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ReportSnapshot.objects.all().select_related("generated_by")
    serializer_class = ReportSnapshotSerializer
    filterset_fields = ["report_type", "generated_by"]

    def get_permissions(self):
        if self.action == "generate":
            return [IsAdminUserExtended()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()
        if getattr(self.request.user, "global_role", None) == "admin":
            return queryset
        return queryset.filter(generated_by=self.request.user)

    @action(detail=False, methods=["post"], url_path="generate")
    def generate(self, request):
        snapshot = generate_report(
            report_type=request.data.get("report_type", "summary"),
            generated_by=request.user,
            parameters=request.data.get("parameters", {}),
        )
        return Response(ReportSnapshotSerializer(snapshot).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        snapshot = self.get_object()
        absolute_path = Path(settings.MEDIA_ROOT) / snapshot.file_path
        if not absolute_path.exists():
            raise Http404("Plik raportu nie istnieje.")
        return FileResponse(absolute_path.open("rb"), as_attachment=True, filename=absolute_path.name)
