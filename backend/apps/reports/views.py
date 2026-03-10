from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.reports.models import ReportSnapshot
from apps.reports.serializers import ReportSnapshotSerializer
from apps.reports.services import generate_report


class ReportSnapshotViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ReportSnapshot.objects.all().select_related("generated_by")
    serializer_class = ReportSnapshotSerializer
    filterset_fields = ["report_type", "generated_by"]

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
        return Response({"file_path": snapshot.file_path})

