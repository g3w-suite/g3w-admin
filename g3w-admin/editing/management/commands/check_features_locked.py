from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from editing.models import *


class Command(BaseCommand):
    """
    This command check feature lock in to database and erase it if past to much time from creation.
    """

    help = 'Check features locked and erase they from database if past to much time from their creations'

    def add_arguments(self, parser):
        # Positional arguments
        parser.add_argument('--time', dest='timepast', default=3600*4, nargs=1, type=int)

    def handle(self, *args, **options):

        # get features lockd with past time > of timepast options value
        now = timezone.now()
        timepast = options['timepast'][0] if isinstance(options['timepast'], list) else options['timepast']
        earlier = now - timezone.timedelta(seconds=timepast)
        features_locked = G3WEditingFeatureLock.objects.filter(time_locked__lt=earlier)


        for feature_lock in features_locked:
            feature_lock.delete()
            self.stdout.write(self.style.SUCCESS('Fetaure lock erased: {}'.format(feature_lock.feature_lock_id)))


