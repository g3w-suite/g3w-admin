# coding=utf-8
"""
    Test Usermanage moduel utility functions
.. note:: This program is free software; you can redistribute it and/or modify
     it under the terms of the Mozilla Public License 2.0.
"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2019-06-19'
__copyright__ = 'Copyright 2019, GIS3W'

from django.test import TestCase, RequestFactory, Client
from django.test.client import RequestFactory
from django.forms import Form
from django.dispatch import receiver
from guardian.shortcuts import assign_perm
from crispy_forms.layout import Field
from usersmanage.models import User, Userbackend, USER_BACKEND_TYPES
from usersmanage.configs import *
from usersmanage.utils import *
from usersmanage.forms import G3WACLForm
from core.forms import GroupForm, G3WRequestFormMixin
from core.models import Group, G3WSpatialRefSys
from core.signals import pre_show_user_data
from .base import BaseUsermanageTestCase
from .utils import setup_testing_user_relations
import copy

# a test form class
class TestForm(G3WRequestFormMixin, G3WACLForm, Form):
    pass


class UsersManageTest(BaseUsermanageTestCase):

    def setUp(self):

        self.factory = RequestFactory()

        setup_testing_user_relations(self)

        # create a map group test
        self.group_test = Group(name='Test', title='Test', srid=G3WSpatialRefSys.objects.get(srid=4326),
                                header_logo_img='')
        self.group_test.save()

    def test_user_groups(self):
        """ Test same util function """

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
        """ Test same util function """

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

    def test_get_roles(self):
        """ Test same util function """

        self.assertEqual(set(get_roles(self.test_editor1)), set([self.main_roles[G3W_EDITOR1]]))
        self.assertEqual(set(get_roles(self.test_editor2)), set([self.main_roles[G3W_EDITOR2]]))
        self.assertEqual(set(get_roles(self.test_editor2_3)), set([self.main_roles[G3W_EDITOR2]]))
        self.assertEqual(set(get_roles(self.test_viewer1)), set([self.main_roles[G3W_VIEWER1]]))

    def test_get_user_groups(self):
        """ Test same util function """

        # Add test_viewer1_3 to test_gu_viewer1_e1_2
        self.test_viewer1_3.groups.add(self.test_gu_viewer1_e1_2)

        self.assertEqual(set(get_user_groups(self.test_viewer1_3)),
                         set([self.test_gu_viewer2, self.test_gu_viewer1_e1_2]))

    def test_get_viewers_for_object(self):
        """ Test same util function """

        # Add group_view to test_viewer1 and test_viewer1_2
        assign_perm('view_group', self.test_viewer1, self.group_test)
        assign_perm('view_group', self.test_viewer1_2, self.group_test)

        # IMPORTANT: use permission string without app name, i.e not 'core.view_group' bu 'view_group'
        viewers = get_viewers_for_object(self.group_test, self.test_viewer1_3, 'view_group')
        self.assertEqual(set(viewers), set([self.test_viewer1, self.test_viewer1_2]))

        # Check passing Editor level 1 user
        viewers = get_viewers_for_object(self.group_test, self.test_editor1, 'view_group')
        self.assertEqual(viewers, [])

    def test_get_fields_by_user(self):
        """ Test same util function """

        def _read_cryspy_field(f):
            """ Internal method to read a list of crispy fields """
            return f.fields[0] if isinstance(f, Field) else f


        request = RequestFactory()

        # As Admin1
        request.user = self.test_admin1
        expected = [
            'editor_user',
            'editor2_user',
            'viewer_users',
            'editor_user_groups',
            'viewer_user_groups'
        ]

        form = TestForm(request=request)

        fields = get_fields_by_user(request.user, form)
        self.assertEqual(set(map(_read_cryspy_field, fields)), set(expected))

        # add 'propagate_viewers' options
        expected.append('propagate_viewers')
        fields = get_fields_by_user(request.user, form, **{'propagate': True})
        self.assertEqual(set(map(_read_cryspy_field, fields)), set(expected))

        # Test options kwargs
        kwargs = {
            'editor_field_required': False,
            'propagate': True
        }

        form = TestForm(request=request)
        expected_k = copy.copy(expected)[1:]
        fields = get_fields_by_user(request.user, form, **kwargs)
        self.assertEqual(set(map(_read_cryspy_field, fields)), set(expected_k))

        # Test options kwargs
        kwargs.update({
            'editor2_field_required': False,
        })

        form = TestForm(request=request)
        expected_k = copy.copy(expected)[2:]
        fields = get_fields_by_user(request.user, form, **kwargs)
        self.assertEqual(set(map(_read_cryspy_field, fields)), set(expected_k))

        # Test options kwargs
        kwargs.update({
            'editor_groups_field_required': False,
        })

        form = TestForm(request=request)
        expected_k = copy.copy(expected)[2:]
        del(expected_k[1])
        fields = get_fields_by_user(request.user, form, **kwargs)
        self.assertEqual(set(map(_read_cryspy_field, fields)), set(expected_k))


        # As Editor level 1
        request.user = self.test_editor1

        expected_e1 = copy.copy(expected)[1:]

        form = TestForm(request=request)
        fields = get_fields_by_user(request.user, form, **{'propagate': True})
        self.assertEqual(set(map(_read_cryspy_field, fields)), set(expected_e1))

        # As Editor level 2
        request.user = self.test_editor2

        expected_e2 = copy.copy(expected_e1)[1:-1]
        del(expected_e2[1])

        form = TestForm(request=request)
        fields = get_fields_by_user(request.user, form, **{'propagate': True})
        self.assertEqual(set(map(_read_cryspy_field, fields)), set(expected_e2))

    def test_get_all_logged_in_users(self):
        """ Test function of the same name """

        # Not logged
        self.assertCountEqual(get_all_logged_in_users(), [])

        # As admin1
        client = Client()
        self.assertTrue(client.login(username=self.test_admin1.username, password=self.test_admin1.username))
        self.assertEqual(get_all_logged_in_users()[0], self.test_admin1)
        client.logout()

    def test_get_groups_for_object(self):
        """ Test function of the same name """

        # no permmission on test map group
        self.assertCountEqual(get_groups_for_object(self.group_test, 'view_group'), [])

        # give permission to 2 groups
        assign_perm('view_group', self.test_gu_editor1, self.group_test)
        assign_perm('view_group', self.test_gu_viewer1, self.group_test)
        assign_perm('view_group', self.test_gu_viewer1_e1_2, self.group_test)
        
        self.assertCountEqual(set(get_groups_for_object(self.group_test, 'view_group')), set([
            self.test_gu_editor1,
            self.test_gu_viewer1,
            self.test_gu_viewer1_e1_2
        ]))

        # get only one grouprole 'viewer'
        self.assertCountEqual(set(get_groups_for_object(self.group_test, 'view_group', grouprole='viewer')), set([
            self.test_gu_viewer1,
            self.test_gu_viewer1_e1_2
        ]))

        # get no roles by different permission
        self.assertCountEqual(get_groups_for_object(self.group_test, 'change_group'), [])

    def test_setPermissionUserObject(self):
        """ Test function of the same name """

        # no permission
        self.assertFalse(self.test_viewer1.has_perm('core.view_group', self.group_test))
        self.assertFalse(self.test_viewer1.has_perm('core.change_group', self.group_test))

        # add permissions
        setPermissionUserObject(self.test_viewer1, self.group_test, ['view_group', 'change_group'])

        self.assertTrue(self.test_viewer1.has_perm('core.view_group', self.group_test))
        self.assertTrue(self.test_viewer1.has_perm('core.change_group', self.group_test))

        # remove permissions
        setPermissionUserObject(self.test_viewer1, self.group_test, ['view_group'], mode='remove')

        self.assertFalse(self.test_viewer1.has_perm('core.view_group', self.group_test))
        self.assertTrue(self.test_viewer1.has_perm('core.change_group', self.group_test))

    def test_get_objects_by_perm(self):
        """ Test function of the same name """

        # add permissions
        assign_perm('view_group', self.test_editor1, self.group_test)
        assign_perm('view_group', self.test_viewer1, self.group_test)
        assign_perm('view_group', self.test_viewer1_2, self.group_test)
        assign_perm('view_group', self.test_gu_viewer1, self.group_test)

        objs = get_objects_by_perm(Group, 'view_group')
        self.assertEqual(len(objs), 3)
        self.assertEqual(set([o.user for o in objs]), set([
            self.test_editor1,
            self.test_viewer1,
            self.test_viewer1_2
        ]))

    def test_crispyBoxACL(self):
        """ Test function of the same name """

        request = RequestFactory()
        request.user = self.test_user1

        form = TestForm(request=request)
        def fake(*args):
            pass
        form.checkEmptyInitialsData = fake

        self.assertIsInstance(crispyBoxACL(form), Div)

    def test_get_perms_by_user_backend(self):
        """ Test function of the same name """

        # With standard backend
        perms = get_perms_by_user_backend(self.test_admin1, self.test_editor1)

        self.assertEqual(set(perms), set([
            'add_user',
            'change_user',
            'delete_user'
        ]))

        # Choice a new backend
        USER_BACKEND_TYPES['test_backend'] = 'TEST_BACKEND'
        self.test_editor2_3.userbackend.backend = 'test_backend'
        self.test_editor2_3.userbackend.save()

        def fake_receiver(sender, **kwargs):
            return [
                'add_user'
            ]

        pre_show_user_data.connect(fake_receiver, sender=self.test_editor2_3)

        perms = get_perms_by_user_backend(self.test_admin1, self.test_editor2_3)
        self.assertEqual(set(perms), set([
            'add_user'
        ]))




