from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from apps.accounts.forms import UserChangeForm, UserCreationForm
from apps.accounts.models import User, UserSkill


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    add_form = UserCreationForm
    form = UserChangeForm
    ordering = ("email",)
    list_display = ("email", "first_name", "last_name", "global_role", "is_active_member", "is_staff")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Dane osobowe", {"fields": ("first_name", "last_name", "avatar", "bio")}),
        (
            "Profil",
            {
                "fields": (
                    "global_role",
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
                )
            },
        ),
        ("Uprawnienia", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Daty", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "first_name", "last_name", "global_role"),
            },
        ),
    )
    search_fields = ("email", "first_name", "last_name")


@admin.register(UserSkill)
class UserSkillAdmin(admin.ModelAdmin):
    list_display = ("user", "name", "category", "proficiency")
    search_fields = ("name", "user__email")
