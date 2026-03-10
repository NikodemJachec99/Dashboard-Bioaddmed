from rest_framework import serializers

from apps.voting.models import VoteBallot, VoteOption, VotePoll


class VoteOptionSerializer(serializers.ModelSerializer):
    votes = serializers.IntegerField(source="ballots.count", read_only=True)

    class Meta:
        model = VoteOption
        fields = ["id", "label", "order", "votes"]


class VoteBallotSerializer(serializers.ModelSerializer):
    voter_email = serializers.SerializerMethodField()

    class Meta:
        model = VoteBallot
        fields = ["id", "poll", "voter", "voter_email", "option", "cast_at"]
        read_only_fields = ["voter", "cast_at"]

    def get_voter_email(self, obj):
        if obj.poll.visibility_type == VotePoll.VisibilityType.ANONYMOUS:
            return None
        return obj.voter.email


class VotePollSerializer(serializers.ModelSerializer):
    options = VoteOptionSerializer(many=True, read_only=True)

    class Meta:
        model = VotePoll
        fields = [
            "id",
            "title",
            "description",
            "poll_type",
            "audience_type",
            "visibility_type",
            "author",
            "related_project",
            "eligible_users",
            "starts_at",
            "ends_at",
            "quorum_required",
            "threshold_type",
            "status",
            "options",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["author", "options"]

