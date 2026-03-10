from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.core.models import TimestampedModel


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email: str, password: str, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str | None = None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email: str, password: str, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    class GlobalRole(models.TextChoices):
        ADMIN = "admin", "Admin"
        MEMBER = "member", "Member"

    username = None
    email = models.EmailField(unique=True)
    global_role = models.CharField(max_length=32, choices=GlobalRole.choices, default=GlobalRole.MEMBER)
    avatar = models.URLField(blank=True)
    bio = models.TextField(blank=True)
    year_of_study = models.CharField(max_length=32, blank=True)
    field_of_study = models.CharField(max_length=120, blank=True)
    specialization = models.CharField(max_length=120, blank=True)
    interests = models.JSONField(default=list, blank=True)
    technologies = models.JSONField(default=list, blank=True)
    experience = models.TextField(blank=True)
    weekly_availability_hours = models.PositiveIntegerField(default=0)
    joined_at = models.DateField(null=True, blank=True)
    is_active_member = models.BooleanField(default=True)
    achievements_summary = models.TextField(blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self) -> str:
        return self.email


class UserSkill(TimestampedModel):
    class Proficiency(models.TextChoices):
        BEGINNER = "beginner", "Beginner"
        INTERMEDIATE = "intermediate", "Intermediate"
        ADVANCED = "advanced", "Advanced"
        EXPERT = "expert", "Expert"

    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="skills")
    name = models.CharField(max_length=120)
    category = models.CharField(max_length=120, blank=True)
    proficiency = models.CharField(max_length=32, choices=Proficiency.choices, default=Proficiency.INTERMEDIATE)

    class Meta:
        unique_together = ("user", "name")

    def __str__(self) -> str:
        return f"{self.user.email} - {self.name}"

