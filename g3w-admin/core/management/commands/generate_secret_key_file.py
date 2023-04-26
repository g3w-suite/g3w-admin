# coding=utf-8
""""
    Django cli command for generation of unique SECRET_KEY
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2023-04-26'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__ = 'MPL 2.0'

from django.core.management.base import BaseCommand
from django.core.management.utils import get_random_secret_key
import os
class Command(BaseCommand):
    """
    This command create a random SECRET_KEY setting value and put it inside a file
    """

    help = 'Create a SECRET_KEY setting value and put inside a file.'

    def add_arguments(self, parser):

        # Positional arguments
        # Default file_path:
        d_file_path = f"{os.path.abspath(os.path.dirname(__file__))}/.secret_key"

        parser.add_argument('--file_path', dest='file_path', default=d_file_path, nargs=1, type=str)

    def handle(self, *args, **options):

        file_path = options['file_path'][0]
        key = get_random_secret_key()
        secret_file = open(file_path, "w")
        secret_file.write(key)
        secret_file.close()

        self.stdout.write(self.style.SUCCESS(f"SECRET_KEY '{key}' saved inside {file_path}"))
