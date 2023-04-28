# coding=utf-8
""""
   CLI command for generation of unique SECRET_KEY
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__    = 'lorenzetti@gis3w.it'
__date__      = '2023-04-26'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__   = 'MPL 2.0'

from django.core.management.base import BaseCommand
from django.core.management.utils import get_random_secret_key
import os

# https://stackoverflow.com/a/53168794
def blankout(instr, r='*', s=1, e=-1):
    if '@' in instr:
        # Handle E-Mail addresses
        a = instr.split('@')
        if e == 0:
            e = len(instr)
        return instr.replace(a[0][s:e], r * (len(a[0][s:e])))
    if e == 0:
        e = len(instr)
    return instr.replace(instr[s:e], r * len(instr[s:e]))

class Command(BaseCommand):
    """
    Create a random SECRET_KEY setting value and put it inside a file
    """

    help = 'Create a SECRET_KEY setting value and put inside a file.'

    def add_arguments(self, parser):

        # Positional arguments
        default_file_path = f"{os.path.abspath(os.path.dirname(__file__))}/.secret_key"

        parser.add_argument('-o', '--output-file', dest='output_file', default=default_file_path, nargs=1, type=str)

    def handle(self, *args, **options):

        output_file = options['output_file'][0]

        key = get_random_secret_key()
        secret_file = open(output_file, "w")
        secret_file.write(key)
        secret_file.close()

        self.stdout.write(self.style.SUCCESS(f"[SECRET_KEY] write '{blankout(key, s=5)}' into {output_file}"))