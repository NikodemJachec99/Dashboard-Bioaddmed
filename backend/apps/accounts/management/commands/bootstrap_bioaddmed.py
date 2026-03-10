import os

from django.core.management.base import BaseCommand

from apps.accounts.models import User


class Command(BaseCommand):
    help = "Tworzy początkowego superusera dla BioAddMed Hub."

    def handle(self, *args, **options):
        email = os.getenv("DJANGO_SUPERUSER_EMAIL", "admin@bioaddmed.local")
        password = os.getenv("DJANGO_SUPERUSER_PASSWORD", "change-me")
        first_name = os.getenv("DJANGO_SUPERUSER_FIRST_NAME", "Admin")
        last_name = os.getenv("DJANGO_SUPERUSER_LAST_NAME", "BioAddMed")

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "is_staff": True,
                "is_superuser": True,
                "global_role": User.GlobalRole.ADMIN,
                "first_name": first_name,
                "last_name": last_name,
            },
        )
        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f"Utworzono superusera {email}"))
        else:
            self.stdout.write(self.style.WARNING(f"Superuser {email} już istnieje"))
