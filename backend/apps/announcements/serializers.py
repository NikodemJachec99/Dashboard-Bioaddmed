from rest_framework import serializers

from apps.announcements.models import Announcement


class AnnouncementSerializer(serializers.ModelSerializer):
    author_email = serializers.CharField(source="author.email", read_only=True)

    class Meta:
        model = Announcement
        fields = ["id", "title", "content", "audience_type", "start_at", "expires_at", "author", "author_email", "is_pinned", "created_at", "updated_at"]
        read_only_fields = ["author"]

