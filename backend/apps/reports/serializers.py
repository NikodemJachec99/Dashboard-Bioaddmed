from rest_framework import serializers

from apps.reports.models import ReportSnapshot


class ReportSnapshotSerializer(serializers.ModelSerializer):
    generated_by_email = serializers.CharField(source="generated_by.email", read_only=True)

    class Meta:
        model = ReportSnapshot
        fields = ["id", "report_type", "generated_by", "generated_by_email", "parameters_json", "file_path", "created_at"]
        read_only_fields = ["generated_by", "file_path"]

