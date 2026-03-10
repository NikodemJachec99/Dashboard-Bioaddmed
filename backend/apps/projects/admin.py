from django.contrib import admin

from apps.projects.models import (
    Project,
    ProjectLink,
    ProjectMembership,
    ProjectMilestone,
    ProjectRisk,
    RecruitmentApplication,
    RecruitmentOpening,
)

admin.site.register(Project)
admin.site.register(ProjectMembership)
admin.site.register(ProjectLink)
admin.site.register(ProjectMilestone)
admin.site.register(ProjectRisk)
admin.site.register(RecruitmentOpening)
admin.site.register(RecruitmentApplication)
