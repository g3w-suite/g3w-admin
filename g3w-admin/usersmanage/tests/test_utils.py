# coding=utf-8
"""
    Test Usermanage moduel utility functions
.. note:: This program is free software; you can redistribute it and/or modify
     it under the terms of the Mozilla Public License 2.0.
"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2019-06-19'
__copyright__ = 'Copyright 2019, GIS3W'

from django.test import TestCase, RequestFactory
from guardian.shortcuts import assign_perm
from crispy_forms.layout import Field
from usersmanage.models import User
from usersmanage.configs import *
from usersmanage.utils import *
from core.forms import GroupForm
from core.models import Group
from .base import BaseUsermanageTestCase
import copy


class UsersManageTest(BaseUsermanageTestCase):

    def setUp(self):

        self.factory = RequestFactory()

        # create a map group test
        self.group_test = Group(name='Test', title='Test')

    def test_user_groups(self):

        user_groups = getUserGroups(self.test_user1)
        self.assertEqual(len(user_groups), 0)

        user_groups = getUserGroups(self.test_editor1)
        self.assertEqual(len(user_groups), 1)
        self.assertEqual(user_groups[0], G3W_EDITOR1)

        user_groups = getUserGroups(self.test_editor2)
        self.assertEqual(len(user_groups), 2)
        self.assertEqual(user_groups[0], G3W_EDITOR2)

        user_groups = getUserGroups(self.test_viewer1)
        self.assertEqual(len(user_groups), 2)
        self.assertEqual(user_groups[0], G3W_VIEWER1)

    def test_user_has_groups(self):

        self.assertTrue(userHasGroups(self.test_editor1, [G3W_EDITOR1]))

        self.assertFalse(userHasGroups(self.test_editor1, [G3W_VIEWER1]))

        self.assertTrue(userHasGroups(self.test_editor1, [G3W_EDITOR1, G3W_EDITOR2]))

        self.assertFalse(userHasGroups(self.test_editor1, [G3W_EDITOR1, G3W_EDITOR2], strict=True))

    def __test_get_fields_by_user(self):

        fields = [
            'editor_user',
            'viewer_users',
            'editor_user_groups',
            'viewer_user_groups'
        ]

        request = self.factory.request()
        for u in ('test_user1', 'user_admin02', 'test_editor1', 'test_editor2'):
            request.user = getattr(self, u)

            core_form_group = GroupForm(**{'request': request})

            filtered_fields = [f.get_field_names()[0][1] for f in get_fields_by_user(request.user, core_form_group)]

            self.assertTrue(filtered_fields == fields)

            del(core_form_group)





