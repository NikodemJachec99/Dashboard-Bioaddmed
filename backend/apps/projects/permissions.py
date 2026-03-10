from apps.projects.models import ProjectMembership


def is_project_coordinator(user, project) -> bool:
    if not user.is_authenticated:
        return False
    if getattr(user, "global_role", None) == "admin":
        return True
    return ProjectMembership.objects.filter(
        user=user,
        project=project,
        project_role=ProjectMembership.Role.COORDINATOR,
        is_active=True,
    ).exists()


def is_project_member(user, project) -> bool:
    if not user.is_authenticated:
        return False
    if getattr(user, "global_role", None) == "admin":
        return True
    return ProjectMembership.objects.filter(user=user, project=project, is_active=True).exists()

