from django.core.management.base import BaseCommand, CommandError
from django.apps import apps
from django.conf import settings


class Command(BaseCommand):
    help = 'Try to update everuy module boy git command'

    def handle(self, *args, **options):

        #

        self.stdout.write(self.style.SUCCESS('UPDATE DONE.'))
