from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from core.models import StatusLog


class Command(BaseCommand):
    """
    This command delete from model StatusLog the rocord older than custom time
    """

    help = 'Delete db logs record older than delta time from current timestamp.' \
           'Usefull runt it with a daily cron job.'

    def add_arguments(self, parser):
        # Positional arguments
        parser.add_argument('--time', dest='timepast', default=3600*4, nargs=1, type=int)

    def handle(self, *args, **options):

        # Get StatusLog with past time > of timepast options value
        now = timezone.now()
        timepast = options['timepast'][0] if isinstance(options['timepast'], list) else options['timepast']
        earlier = now - timezone.timedelta(seconds=timepast)
        log_records = StatusLog.objects.filter(create_datetime__lt=earlier)
        n_to_delete = len(log_records)
        log_records.delete()

        self.stdout.write(self.style.SUCCESS(f'DB log records erased: {n_to_delete}'))


