from django.conf import settings
from django.db import models

from apps.core.models import TimestampedModel


class Project(TimestampedModel):
    class Category(models.TextChoices):
        RESEARCH = "research", "Badawczy"
        BIOMEDICAL = "biomedical", "Biomedyczny"
        ENGINEERING = "engineering", "Inżynierski"
        ORGANIZATIONAL = "organizational", "Organizacyjny"
        CONFERENCE = "conference", "Konferencyjny"
        GRANT = "grant", "Grantowy"
        PROMOTIONAL = "promotional", "Promocyjny"
        EDUCATIONAL = "educational", "Edukacyjny"

    class Stage(models.TextChoices):
        IDEA = "idea", "Pomysł"
        ANALYSIS = "analysis", "Analiza"
        PLANNING = "planning", "Planowanie"
        IN_PROGRESS = "in_progress", "W realizacji"
        TESTING = "testing", "Testy"
        VALIDATION = "validation", "Walidacja"
        PUBLICATION = "publication", "Publikacja"
        COMPLETED = "completed", "Zakończony"
        PAUSED = "paused", "Wstrzymany"
        ARCHIVED = "archived", "Zarchiwizowany"

    class Status(models.TextChoices):
        ACTIVE = "active", "Aktywny"
        AT_RISK = "at_risk", "Zagrożony"
        BLOCKED = "blocked", "Zablokowany"
        COMPLETED = "completed", "Zakończony"
        ARCHIVED = "archived", "Zarchiwizowany"

    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    short_description = models.CharField(max_length=255)
    full_description = models.TextField(blank=True)
    category = models.CharField(max_length=40, choices=Category.choices)
    project_type = models.CharField(max_length=100, blank=True)
    stage = models.CharField(max_length=40, choices=Stage.choices, default=Stage.IDEA)
    status = models.CharField(max_length=40, choices=Status.choices, default=Status.ACTIVE)
    progress_percent = models.PositiveSmallIntegerField(default=0)
    start_date = models.DateField(null=True, blank=True)
    planned_end_date = models.DateField(null=True, blank=True)
    actual_end_date = models.DateField(null=True, blank=True)
    summary_results = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_projects",
    )
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, through="ProjectMembership", related_name="projects")

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class ProjectMembership(TimestampedModel):
    class Role(models.TextChoices):
        COORDINATOR = "coordinator", "Coordinator"
        MEMBER = "member", "Project Member"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="project_memberships")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="memberships")
    project_role = models.CharField(max_length=32, choices=Role.choices, default=Role.MEMBER)
    joined_at = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("user", "project")

    def __str__(self) -> str:
        return f"{self.user.email} -> {self.project.name}"


class ProjectLink(TimestampedModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="links")
    label = models.CharField(max_length=120)
    url = models.URLField()
    type = models.CharField(max_length=60, blank=True)


class ProjectMilestone(TimestampedModel):
    class Status(models.TextChoices):
        PLANNED = "planned", "Planned"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        BLOCKED = "blocked", "Blocked"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="milestones")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PLANNED)
    progress_percent = models.PositiveSmallIntegerField(default=0)


class ProjectRisk(TimestampedModel):
    class Severity(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        MONITORED = "monitored", "Monitored"
        MITIGATED = "mitigated", "Mitigated"
        CLOSED = "closed", "Closed"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="risks")
    title = models.CharField(max_length=255)
    description = models.TextField()
    severity = models.CharField(max_length=32, choices=Severity.choices, default=Severity.MEDIUM)
    impact = models.TextField(blank=True)
    mitigation_plan = models.TextField(blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_risks",
    )
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.OPEN)


class RecruitmentOpening(TimestampedModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="recruitment_openings")
    title = models.CharField(max_length=255)
    description = models.TextField()
    required_competencies = models.JSONField(default=list, blank=True)
    slots = models.PositiveIntegerField(default=1)
    weekly_hours = models.PositiveIntegerField(default=0)
    deadline = models.DateField(null=True, blank=True)
    is_open = models.BooleanField(default=True)


class RecruitmentApplication(TimestampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"

    opening = models.ForeignKey(RecruitmentOpening, on_delete=models.CASCADE, related_name="applications")
    applicant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="applications")
    motivation = models.TextField(blank=True)
    availability_note = models.TextField(blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PENDING)

    class Meta:
        unique_together = ("opening", "applicant")

