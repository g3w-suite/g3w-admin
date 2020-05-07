# coding=utf-8
""""
load_demo_dev_user_groups.py
    Load into db demo/dev users and user groups.
..  note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-05-06'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from usersmanage.tests.utils import setup_testing_user, setup_testing_user_relations


class Command(BaseCommand):
    help = 'Load into db demo/dev users and user groups.'
    requires_system_checks = False

    def handle(self, *args, **options):

        class c(object):
            pass

        cls = c()
        setup_testing_user(cls)
        setup_testing_user_relations(cls)

        print('Users and user groups loaded')



