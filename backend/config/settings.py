import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
USE_SQLITE_FOR_TESTS = os.getenv("USE_SQLITE_FOR_TESTS", "False").lower() == "true"
DISABLE_APP_MIGRATIONS = os.getenv("DJANGO_DISABLE_APP_MIGRATIONS", "False").lower() == "true"

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "change-me")
DEBUG = os.getenv("DJANGO_DEBUG", "False").lower() == "true"
ALLOWED_HOSTS = [host.strip() for host in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost").split(",") if host.strip()]
APP_DOMAIN = os.getenv("APP_DOMAIN", "")
AUTH_COOKIE_DOMAIN = os.getenv("AUTH_COOKIE_DOMAIN") or None
AUTH_COOKIE_SECURE = os.getenv("AUTH_COOKIE_SECURE", "true" if not DEBUG else "false").lower() == "true"
AUTH_COOKIE_SAMESITE = os.getenv("AUTH_COOKIE_SAMESITE", "Lax")
AUTH_COOKIE_PATH = os.getenv("AUTH_COOKIE_PATH", "/")
SECURE_SSL_REDIRECT = os.getenv("DJANGO_SECURE_SSL_REDIRECT", "true" if not DEBUG else "false").lower() == "true"

CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("DJANGO_CSRF_TRUSTED_ORIGINS", "").split(",")
    if origin.strip()
]
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("DJANGO_CORS_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = True

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.postgres",
    "corsheaders",
    "rest_framework",
    "rest_framework.authtoken",
    "rest_framework_simplejwt.token_blacklist",
    "drf_spectacular",
    "django_filters",
    "apps.core",
    "apps.accounts",
    "apps.projects",
    "apps.tasks",
    "apps.meetings",
    "apps.voting",
    "apps.knowledge",
    "apps.announcements",
    "apps.dashboard",
    "apps.reports",
    "apps.resources",
    "apps.achievements",
    "apps.audit",
    "apps.notifications",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]

if USE_SQLITE_FOR_TESTS:
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "test.sqlite3"}}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("POSTGRES_DB", "bioaddmed"),
            "USER": os.getenv("POSTGRES_USER", "bioaddmed"),
            "PASSWORD": os.getenv("POSTGRES_PASSWORD", "change-me"),
            "HOST": os.getenv("POSTGRES_HOST", "postgres"),
            "PORT": os.getenv("POSTGRES_PORT", "5432"),
        }
    }

if USE_SQLITE_FOR_TESTS or DISABLE_APP_MIGRATIONS:
    MIGRATION_MODULES = {
        "admin": None,
        "accounts": None,
        "achievements": None,
        "announcements": None,
        "auth": None,
        "authtoken": None,
        "audit": None,
        "contenttypes": None,
        "core": None,
        "corsheaders": None,
        "dashboard": None,
        "django_filters": None,
        "drf_spectacular": None,
        "knowledge": None,
        "messages": None,
        "meetings": None,
        "notifications": None,
        "postgres": None,
        "projects": None,
        "reports": None,
        "resources": None,
        "rest_framework": None,
        "sessions": None,
        "staticfiles": None,
        "tasks": None,
        "token_blacklist": None,
        "voting": None,
    }

AUTH_USER_MODEL = "accounts.User"
LANGUAGE_CODE = "pl"
TIME_ZONE = "Europe/Warsaw"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "apps.accounts.authentication.CookieJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardResultsSetPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_RATES": {
        "login": os.getenv("DJANGO_LOGIN_THROTTLE", "10/hour"),
        "password_reset": os.getenv("DJANGO_PASSWORD_RESET_THROTTLE", "5/hour"),
    },
}

SPECTACULAR_SETTINGS = {
    "TITLE": "BioAddMed Hub API",
    "DESCRIPTION": "Platforma operacyjna BioAddMed Hub",
    "VERSION": "1.0.0",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "SIGNING_KEY": os.getenv("JWT_SIGNING_KEY", SECRET_KEY),
}

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG
X_FRAME_OPTIONS = "DENY"

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/1")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/2")
CELERY_BEAT_SCHEDULE = {
    "close-expired-polls": {
        "task": "apps.voting.tasks.close_expired_polls",
        "schedule": 300.0,
    },
    "dispatch-notifications": {
        "task": "apps.notifications.tasks.dispatch_pending_notifications",
        "schedule": 120.0,
    },
    "create-overdue-alerts": {
        "task": "apps.tasks.tasks.flag_overdue_tasks",
        "schedule": 600.0,
    },
}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}
