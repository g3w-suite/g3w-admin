# coding=utf-8
""""
    Commands for db logging.
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2023-03-09'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from core.models import StatusLog


class Command(BaseCommand):
    """
    This command delete from model StatusLog the records older than custom time
    """

    help = 'Delete db logs record older than delta days from current timestamp.' \
           'Usefull runt it with a daily cron job.'

    def add_arguments(self, parser):
        # Positional arguments
        parser.add_argument('--days', dest='daypast', default=10, nargs=1, type=int)

    def handle(self, *args, **options):

        # Get StatusLog with past time > of timepast options value
        now = timezone.now()
        daypast = options['daypast'][0] if isinstance(options['daypast'], list) else options['daypast']
        earlier = now - timezone.timedelta(days=daypast)
        log_records = StatusLog.objects.filter(create_datetime__lt=earlier)
        n_to_delete = len(log_records)
        #log_records.delete()

        if n_to_delete:
            self.stdout.write(self.style.SUCCESS(f'DB log records deleted: {n_to_delete}'))
        else:
            self.stdout.write(self.style.SUCCESS(f'No records to delete.'))




