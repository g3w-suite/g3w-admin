# from: https://github.com/dkarchmer/aws-eb-docker-django/blob/master/authentication/management/commands/initadmin.py
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import User
import os


class Command(BaseCommand):

    def handle(self, *args, **options):
        if User.objects.count() == 1:
            username = os.environ.get('G3WSUITE_ADMIN_USERNAME', 'admin01')
            password = os.environ.get('G3WSUITE_ADMIN_PASSWORD', 'admin01')
            email = os.environ.get('G3WSUITE_ADMIN_EMAIL', 'lorenzetti@gis3w.it')
            print('Creating account for %s (%s)' % (username, email))
            admin = User.objects.create_superuser(email=email, username=username, password=password)
            admin.is_active = True
            admin.is_admin = True
            admin.save()
        else:
            print('Admin accounts can only be initialized if no Accounts exist other than Anonymoususer')