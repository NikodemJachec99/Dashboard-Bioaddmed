from rest_framework import serializers

from apps.meetings.models import Meeting, MeetingActionItem, MeetingParticipant


class MeetingParticipantSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = MeetingParticipant
        fields = ["id", "user", "user_email", "attendance_status", "presence_confirmed_at"]


class MeetingActionItemSerializer(serializers.ModelSerializer):
    assignee_email = serializers.CharField(source="assignee.email", read_only=True)

    class Meta:
        model = MeetingActionItem
        fields = ["id", "task", "description", "assignee", "assignee_email", "due_date", "created_at"]


class MeetingSerializer(serializers.ModelSerializer):
    participants = MeetingParticipantSerializer(many=True, read_only=True)
    action_items = MeetingActionItemSerializer(many=True, read_only=True)

    class Meta:
        model = Meeting
        fields = [
            "id",
            "title",
            "description",
            "meeting_type",
            "related_project",
            "organizer",
            "start_at",
            "end_at",
            "location",
            "online_url",
            "agenda",
            "notes",
            "status",
            "participants",
            "action_items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["organizer"]

