from django.conf import settings
from django.db import models

from apps.core.models import TimestampedModel


class KnowledgeArticle(TimestampedModel):
    class Category(models.TextChoices):
        GUIDE = "guide", "Poradnik"
        INSTRUCTION = "instruction", "Instrukcja"
        STANDARD = "standard", "Standard"
        TEMPLATE = "template", "Wzór"
        CHECKLIST = "checklist", "Checklist"
        LESSON = "lesson", "Lessons Learned"
        FAQ = "faq", "FAQ"
        ONBOARDING = "onboarding", "Onboarding"

    class Visibility(models.TextChoices):
        INTERNAL = "internal", "Internal"
        PROJECT = "project", "Project"
        PRIVATE = "private", "Private"

    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    content = models.TextField()
    category = models.CharField(max_length=32, choices=Category.choices)
    visibility = models.CharField(max_length=32, choices=Visibility.choices, default=Visibility.INTERNAL)
    related_project = models.ForeignKey("projects.Project", on_delete=models.SET_NULL, null=True, blank=True, related_name="knowledge_articles")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="knowledge_articles")
    is_pinned = models.BooleanField(default=False)
    version = models.PositiveIntegerField(default=1)

