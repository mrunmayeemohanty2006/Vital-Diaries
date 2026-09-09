import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Initialize the default administrator account (e.g. miti / miti2006)'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, default='miti@vitaldiaries.internal')
        parser.add_argument('--name', type=str, default='Administrator Miti')
        parser.add_argument('--password', type=str, default='miti2006')

    def handle(self, *args, **options):
        email = options['email'].lower().strip()
        name = options['name'].strip()
        password = options['password']

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'name': name,
                'is_staff': True,
                'is_superuser': True,
                'is_active': True,
            }
        )
        user.set_password(password)
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.save()

        action = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{action} superuser '{name}' <{email}> successfully with hashed password."))
