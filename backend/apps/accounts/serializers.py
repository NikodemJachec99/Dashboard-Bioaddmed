from django.contrib.auth import get_user_model
from django.contrib.auth.forms import SetPasswordForm
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.accounts.models import UserSkill
from apps.achievements.models import Achievement
from apps.audit.models import ActivityLog

User = get_user_model()


class UserSkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSkill
        fields = ["id", "name", "category", "proficiency", "created_at", "updated_at"]


class UserSerializer(serializers.ModelSerializer):
    skills = UserSkillSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "global_role",
            "avatar",
            "bio",
            "year_of_study",
            "field_of_study",
            "specialization",
            "interests",
            "technologies",
            "experience",
            "weekly_availability_hours",
            "joined_at",
            "is_active_member",
            "achievements_summary",
            "skills",
            "is_active",
        ]
        read_only_fields = ["id", "skills"]


class UserCreateSerializer(UserSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ["password"]

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    password = serializers.CharField(min_length=8)

    def validate_password(self, value):
        validate_password(value)
        return value

    def save(self, user):
        form = SetPasswordForm(user, {"new_password1": self.validated_data["password"], "new_password2": self.validated_data["password"]})
        if not form.is_valid():
            raise serializers.ValidationError(form.errors)
        form.save()
        return user


class UserActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLog
        fields = ["id", "action_type", "entity_type", "entity_id", "description", "metadata_json", "created_at"]


class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = ["id", "title", "category", "description", "issued_at", "project_id"]

