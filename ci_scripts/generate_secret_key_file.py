# coding=utf-8
""""
   CLI command for generation of unique SECRET_KEY
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2023-04-26'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__ = 'MPL 2.0'

from django.core.management.utils import get_random_secret_key
from argparse import ArgumentParser
import os

def generate_secret_key_file(output_file):

    key = get_random_secret_key()
    secret_file = open(output_file, "w")
    secret_file.write(key)
    secret_file.close()

    print(f"SECRET_KEY '{key}' saved inside {output_file}")

if __name__ == "__main__":
    parser = ArgumentParser(
        # name of program
        prog="Create a SECRET_KEY file",
        # description
        description="Create a file with inside a SECRET_KEY random value.",
    )

    d_file_path = f"{os.path.abspath(os.path.dirname(__file__))}/.secret_key"
    parser.add_argument("-o", "--output-file", dest="output_file", default=d_file_path)

    generate_secret_key_file(**vars(parser.parse_args()))