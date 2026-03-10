import factory
import pytest
from django.utils import timezone

from apps.accounts.models import User
from apps.projects.models import Project, ProjectMembership
from apps.tasks.models import KanbanBoard, KanbanColumn, Task
from apps.voting.models import VoteOption, VotePoll


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    first_name = "Test"
    last_name = factory.Sequence(lambda n: f"User{n}")
    password = factory.PostGenerationMethodCall("set_password", "password123!")


class ProjectFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Project

    name = factory.Sequence(lambda n: f"Projekt {n}")
    slug = factory.Sequence(lambda n: f"projekt-{n}")
    short_description = "Opis projektu"
    category = Project.Category.RESEARCH
    created_by = factory.SubFactory(UserFactory)


class MembershipFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ProjectMembership

    user = factory.SubFactory(UserFactory)
    project = factory.SubFactory(ProjectFactory)
    project_role = ProjectMembership.Role.COORDINATOR


class BoardFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = KanbanBoard

    project = factory.SubFactory(ProjectFactory)
    name = factory.Sequence(lambda n: f"Board {n}")


class ColumnFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = KanbanColumn

    board = factory.SubFactory(BoardFactory)
    name = "To Do"
    order = 0


class TaskFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Task

    project = factory.SubFactory(ProjectFactory)
    column = factory.LazyAttribute(
        lambda obj: KanbanColumn.objects.create(
            board=KanbanBoard.objects.get_or_create(project=obj.project, defaults={"name": f"{obj.project.name} Board"})[0],
            name="To Do",
            order=0,
        )
    )
    title = factory.Sequence(lambda n: f"Task {n}")
    created_by = factory.SubFactory(UserFactory)


class PollFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = VotePoll

    title = factory.Sequence(lambda n: f"Głosowanie {n}")
    poll_type = VotePoll.PollType.SINGLE
    starts_at = factory.LazyFunction(timezone.now)
    ends_at = factory.LazyFunction(lambda: timezone.now() + timezone.timedelta(days=1))
    status = VotePoll.Status.ACTIVE
    author = factory.SubFactory(UserFactory)


class VoteOptionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = VoteOption

    poll = factory.SubFactory(PollFactory)
    label = factory.Sequence(lambda n: f"Opcja {n}")
    order = 0


@pytest.fixture
def user_factory():
    return UserFactory


@pytest.fixture
def project_factory():
    return ProjectFactory


@pytest.fixture
def membership_factory():
    return MembershipFactory


@pytest.fixture
def task_factory():
    return TaskFactory


@pytest.fixture
def poll_factory():
    return PollFactory


@pytest.fixture
def vote_option_factory():
    return VoteOptionFactory
