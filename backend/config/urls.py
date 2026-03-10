from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter

from apps.accounts.views import AuthViewSet, UserViewSet
from apps.projects.views import ProjectViewSet
from apps.tasks.views import TaskViewSet
from apps.meetings.views import MeetingViewSet
from apps.voting.views import PollViewSet
from apps.knowledge.views import KnowledgeArticleViewSet
from apps.announcements.views import AnnouncementViewSet
from apps.dashboard.views import DashboardViewSet
from apps.reports.views import ReportSnapshotViewSet
from apps.resources.views import ResourceViewSet, ReservationViewSet
from apps.achievements.views import AchievementViewSet
from apps.notifications.views import NotificationViewSet
from apps.core.views import healthcheck

router = DefaultRouter()
router.register("auth", AuthViewSet, basename="auth")
router.register("users", UserViewSet, basename="users")
router.register("projects", ProjectViewSet, basename="projects")
router.register("tasks", TaskViewSet, basename="tasks")
router.register("meetings", MeetingViewSet, basename="meetings")
router.register("polls", PollViewSet, basename="polls")
router.register("knowledge", KnowledgeArticleViewSet, basename="knowledge")
router.register("announcements", AnnouncementViewSet, basename="announcements")
router.register("dashboard", DashboardViewSet, basename="dashboard")
router.register("reports", ReportSnapshotViewSet, basename="reports")
router.register("resources", ResourceViewSet, basename="resources")
router.register("reservations", ReservationViewSet, basename="reservations")
router.register("portfolio", AchievementViewSet, basename="portfolio")
router.register("notifications", NotificationViewSet, basename="notifications")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", healthcheck, name="health"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/health/", healthcheck, name="api-health"),
    path("api/", include(router.urls)),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
