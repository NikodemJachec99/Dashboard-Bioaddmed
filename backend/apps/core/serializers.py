from rest_framework import serializers

from apps.core.models import FileAttachment


class FileAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_email = serializers.CharField(source="uploaded_by.email", read_only=True)
    file_url = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()

    class Meta:
        model = FileAttachment
        fields = [
            "id",
            "label",
            "file",
            "file_url",
            "file_name",
            "file_size",
            "uploaded_by",
            "uploaded_by_email",
            "metadata_json",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["uploaded_by"]

    def get_file_url(self, obj):
        request = self.context.get("request")
        if not obj.file:
            return ""
        url = obj.file.url
        return request.build_absolute_uri(url) if request else url

    def get_file_name(self, obj):
        return obj.file.name.rsplit("/", 1)[-1] if obj.file else ""

    def get_file_size(self, obj):
        try:
            return obj.file.size
        except Exception:
            return None
