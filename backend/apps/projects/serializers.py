from rest_framework import serializers

from apps.projects.models import (
    Project,
    ProjectLink,
    ProjectMembership,
    ProjectMilestone,
    ProjectRisk,
    RecruitmentApplication,
    RecruitmentOpening,
)


class ProjectMembershipSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ProjectMembership
        fields = ["id", "user", "user_email", "user_name", "project_role", "joined_at", "is_active"]

    def get_user_name(self, obj) -> str:
        return f"{obj.user.first_name} {obj.user.last_name}".strip()


class ProjectLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectLink
        fields = ["id", "label", "url", "type", "created_at", "updated_at"]


class ProjectMilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectMilestone
        fields = ["id", "title", "description", "due_date", "status", "progress_percent", "created_at", "updated_at"]


class ProjectRiskSerializer(serializers.ModelSerializer):
    owner_email = serializers.CharField(source="owner.email", read_only=True)

    class Meta:
        model = ProjectRisk
        fields = [
            "id",
            "title",
            "description",
            "severity",
            "impact",
            "mitigation_plan",
            "owner",
            "owner_email",
            "status",
            "created_at",
            "updated_at",
        ]


class RecruitmentApplicationSerializer(serializers.ModelSerializer):
    applicant_email = serializers.CharField(source="applicant.email", read_only=True)

    class Meta:
        model = RecruitmentApplication
        fields = ["id", "applicant", "applicant_email", "motivation", "availability_note", "status", "created_at"]
        read_only_fields = ["applicant", "applicant_email"]


class RecruitmentOpeningSerializer(serializers.ModelSerializer):
    applications = RecruitmentApplicationSerializer(many=True, read_only=True)

    class Meta:
        model = RecruitmentOpening
        fields = [
            "id",
            "title",
            "description",
            "required_competencies",
            "slots",
            "weekly_hours",
            "deadline",
            "is_open",
            "applications",
            "created_at",
            "updated_at",
        ]


class ProjectSerializer(serializers.ModelSerializer):
    memberships = ProjectMembershipSerializer(many=True, read_only=True)
    links = ProjectLinkSerializer(many=True, read_only=True)
    milestones = ProjectMilestoneSerializer(many=True, read_only=True)
    risks = ProjectRiskSerializer(many=True, read_only=True)
    recruitment_openings = RecruitmentOpeningSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "slug",
            "short_description",
            "full_description",
            "category",
            "project_type",
            "stage",
            "status",
            "progress_percent",
            "start_date",
            "planned_end_date",
            "actual_end_date",
            "summary_results",
            "created_by",
            "memberships",
            "links",
            "milestones",
            "risks",
            "recruitment_openings",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by"]
