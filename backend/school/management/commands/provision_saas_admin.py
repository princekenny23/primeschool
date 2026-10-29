import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from school.models import UserProfile


class Command(BaseCommand):
    help = "Create the SaaS administrator configured through deployment environment variables."

    def handle(self, *args, **options):
        if os.environ.get("PROVISION_SAAS_ADMIN", "").lower() != "true":
            self.stdout.write("SaaS admin provisioning is disabled.")
            return

        username = os.environ.get("SAAS_ADMIN_USERNAME", "").strip()
        email = os.environ.get("SAAS_ADMIN_EMAIL", "").strip()
        password = os.environ.get("SAAS_ADMIN_PASSWORD", "")
        missing = [
            name
            for name, value in (
                ("SAAS_ADMIN_USERNAME", username),
                ("SAAS_ADMIN_EMAIL", email),
                ("SAAS_ADMIN_PASSWORD", password),
            )
            if not value
        ]
        if missing:
            raise CommandError(f"Missing required environment variables: {', '.join(missing)}")

        User = get_user_model()
        user, created = User.objects.get_or_create(
            username=username,
            defaults={"email": email},
        )
        if created:
            user.set_password(password)
        else:
            user.email = email
        user.is_active = True
        user.is_staff = True
        user.is_superuser = True
        user.save()

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = "saasadmin"
        profile.school = None
        profile.save(update_fields=["role", "school"])

        action = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{action} SaaS admin '{username}'."))
