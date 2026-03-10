from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db.models import QuerySet
from rest_framework import status, viewsets
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from apps.accounts.models import UserSkill
from apps.accounts.permissions import IsAdminUserExtended
from apps.accounts.serializers import (
    AchievementSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetSerializer,
    UserActivitySerializer,
    UserCreateSerializer,
    UserSerializer,
    UserSkillSerializer,
)
from apps.accounts.throttles import LoginRateThrottle, PasswordResetRateThrottle
from apps.achievements.models import Achievement
from apps.audit.models import ActivityLog
from apps.projects.models import ProjectMembership

User = get_user_model()


def _set_auth_cookies(response: Response, refresh: RefreshToken) -> Response:
    common_kwargs = {
        "domain": settings.AUTH_COOKIE_DOMAIN,
        "httponly": True,
        "path": settings.AUTH_COOKIE_PATH,
        "samesite": settings.AUTH_COOKIE_SAMESITE,
        "secure": settings.AUTH_COOKIE_SECURE,
    }
    response.set_cookie(
        "access_token",
        str(refresh.access_token),
        max_age=int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
        **common_kwargs,
    )
    response.set_cookie(
        "refresh_token",
        str(refresh),
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        **common_kwargs,
    )
    return response


def _clear_auth_cookies(response: Response) -> Response:
    response.delete_cookie("access_token", path=settings.AUTH_COOKIE_PATH, domain=settings.AUTH_COOKIE_DOMAIN)
    response.delete_cookie("refresh_token", path=settings.AUTH_COOKIE_PATH, domain=settings.AUTH_COOKIE_DOMAIN)
    return response


class AuthViewSet(viewsets.ViewSet):
    serializer_class = serializers.Serializer

    def get_permissions(self):
        if self.action in {"login", "refresh", "password_reset", "password_reset_confirm"}:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_throttles(self):
        if self.action == "login":
            return [LoginRateThrottle()]
        if self.action == "password_reset":
            return [PasswordResetRateThrottle()]
        return super().get_throttles()

    @action(detail=False, methods=["post"], url_path="login")
    def login(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(request, email=serializer.validated_data["email"], password=serializer.validated_data["password"])
        if not user:
            return Response({"detail": "Nieprawidłowy email lub hasło."}, status=status.HTTP_400_BAD_REQUEST)
        refresh = RefreshToken.for_user(user)
        response = Response(UserSerializer(user).data)
        return _set_auth_cookies(response, refresh)

    @action(detail=False, methods=["post"], url_path="refresh")
    def refresh(self, request):
        raw_token = request.COOKIES.get("refresh_token")
        if not raw_token:
            return Response({"detail": "Brak refresh tokenu."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = TokenRefreshSerializer(data={"refresh": raw_token})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError:
            response = Response({"detail": "Sesja wygasła. Zaloguj się ponownie."}, status=status.HTTP_401_UNAUTHORIZED)
            return _clear_auth_cookies(response)

        refresh_token = serializer.validated_data.get("refresh", raw_token)
        response = Response({"detail": "Token odświeżony."})
        return _set_auth_cookies(response, RefreshToken(refresh_token))

    @action(detail=False, methods=["post"], url_path="logout")
    def logout(self, request):
        raw_token = request.COOKIES.get("refresh_token")
        if raw_token:
            try:
                RefreshToken(raw_token).blacklist()
            except TokenError:
                pass
        response = Response(status=status.HTTP_204_NO_CONTENT)
        return _clear_auth_cookies(response)

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        return Response(UserSerializer(request.user).data)

    @action(detail=False, methods=["post"], url_path="password-reset")
    def password_reset(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email=serializer.validated_data["email"]).first()
        if user:
            token = default_token_generator.make_token(user)
            send_mail(
                subject="BioAddMed Hub - reset hasła",
                message=f"Token resetu hasła: {token}",
                from_email="no-reply@bioaddmed.local",
                recipient_list=[user.email],
            )
        return Response({"detail": "Jeśli konto istnieje, wysłaliśmy instrukcję resetu."})

    @action(detail=False, methods=["post"], url_path="password-reset-confirm")
    def password_reset_confirm(self, request):
        email = request.data.get("email")
        token = request.data.get("token")
        user = User.objects.filter(email=email).first()
        if not user or not default_token_generator.check_token(user, token):
            return Response({"detail": "Nieprawidłowy token resetu."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user)
        return Response({"detail": "Hasło zostało ustawione."})


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("last_name", "first_name", "email")
    search_fields = ["email", "first_name", "last_name", "field_of_study", "specialization"]
    filterset_fields = ["global_role", "is_active", "is_active_member"]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in ["create", "destroy"]:
            return [IsAdminUserExtended()]
        return super().get_permissions()

    def update(self, request, *args, **kwargs):
        if request.user.global_role != "admin" and str(request.user.pk) != kwargs.get("pk"):
            return Response({"detail": "Brak uprawnień."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if request.user.global_role != "admin" and str(request.user.pk) != kwargs.get("pk"):
            return Response({"detail": "Brak uprawnień."}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["get", "post"], url_path="skills")
    def skills(self, request, pk=None):
        user = self.get_object()
        if request.method == "GET":
            return Response(UserSkillSerializer(user.skills.all(), many=True).data)
        serializer = UserSkillSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch", "delete"], url_path=r"skills/(?P<skill_id>\d+)")
    def skill_detail(self, request, pk=None, skill_id=None):
        skill = UserSkill.objects.get(pk=skill_id, user_id=pk)
        if request.method == "PATCH":
            serializer = UserSkillSerializer(skill, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        skill.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"], url_path="projects")
    def projects(self, request, pk=None):
        memberships = ProjectMembership.objects.filter(user_id=pk, is_active=True).select_related("project")
        payload = [
            {
                "membership_id": membership.id,
                "project_id": membership.project_id,
                "project_name": membership.project.name,
                "project_slug": membership.project.slug,
                "project_role": membership.project_role,
            }
            for membership in memberships
        ]
        return Response(payload)

    @action(detail=True, methods=["get"], url_path="activity")
    def activity(self, request, pk=None):
        queryset: QuerySet[ActivityLog] = ActivityLog.objects.filter(user_id=pk)[:50]
        return Response(UserActivitySerializer(queryset, many=True).data)

    @action(detail=True, methods=["get"], url_path="portfolio")
    def portfolio(self, request, pk=None):
        queryset = Achievement.objects.filter(user_id=pk).select_related("project")
        return Response(AchievementSerializer(queryset, many=True).data)
