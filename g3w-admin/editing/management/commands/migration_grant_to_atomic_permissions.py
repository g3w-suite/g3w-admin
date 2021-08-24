# coding=utf-8
""""
    Command to migrate users and users_group grants from old to new atomic capabilities ssystem.
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2021-08-24'
__copyright__ = 'Copyright 2015 - 2021, Gis3w'

from django.core.management.base import BaseCommand, CommandError
from guardian.core import ObjectPermissionChecker
from qdjango.models import Layer
from usersmanage.utils import get_users_for_object, get_groups_for_object, setPermissionUserObject
from editing.models import EDITING_ATOMIC_PERMISSIONS


class Command(BaseCommand):

    help = 'Migrate user and user group permissions to new \'atomic\' capabilities system.'

    def handle(self, *args, **options):

        # For every layers get user and user_groups with change_layer permissions
        layers = Layer.objects.all()

        changed_users = 0
        changed_groups = 0
        for l in layers:

            # Get every 'viewer' and 'editor' user group with 'change_layer' permission
            user_groups = list(set(get_groups_for_object(l, 'change_layer', 'viewer') + \
                          get_groups_for_object(l, 'change_layer', 'editor')))

            users = get_users_for_object(l, 'change_layer', with_anonymous=True)

            # Group before to avoid give single user grant
            for g in user_groups:
                g = ObjectPermissionChecker(g)
                for p in EDITING_ATOMIC_PERMISSIONS:
                    if not g.has_perm(p, l):
                        setPermissionUserObject(g.group, l, [p])
                        changed_groups += 1
                        self.stdout.write(self.style.SUCCESS(f'Give atomic permissions to user group {g.group.name}'))

            for u in users:
                u = ObjectPermissionChecker(u)
                for p in EDITING_ATOMIC_PERMISSIONS:
                    if not u.has_perm(p, l):
                        setPermissionUserObject(u.user, l, [p])
                        changed_users += 1
                        self.stdout.write(self.style.SUCCESS(f'Give atomic permissions to user {u.user.username}'))

        self.stdout.write(self.style.SUCCESS(f'-----------------------------------------------------------'))
        self.stdout.write(self.style.SUCCESS(f'Total user grants changed: {changed_users}'))
        self.stdout.write(self.style.SUCCESS(f'Total user group grants changed: {changed_groups}'))
