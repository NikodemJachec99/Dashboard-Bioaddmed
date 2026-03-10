from rest_framework import serializers

from apps.achievements.models import Achievement


class AchievementSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = Achievement
        fields = ["id", "user", "user_email", "project", "title", "category", "description", "issued_at", "created_at", "updated_at"]

