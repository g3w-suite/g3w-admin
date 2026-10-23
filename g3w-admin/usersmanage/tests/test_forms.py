# coding=utf-8
""""
    Usermanage testing forms module
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-04-14'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

import os.path

from django.conf import settings
from django.test.client import RequestFactory
from django.core.exceptions import ObjectDoesNotExist

from usersmanage.forms import G3WUserForm, User, USER_BACKEND_DEFAULT, G3WUserGroupForm, AuthGroup
from usersmanage.utils import userHasGroups
from usersmanage.models import Group as UserGroup
from .utils import setup_testing_user_relations
from .base import BaseUsermanageTestCase, \
    G3W_EDITOR1, \
    G3W_EDITOR2, \
    G3W_VIEWER1
import copy


class UsermanageFormsTest(BaseUsermanageTestCase):

    def setUp(self) -> None:
        super(UsermanageFormsTest, self).setUp()

        self.request = RequestFactory
        self.users_password = '%%tgrtyey&&gsyhr892'

    def test_user_form_crud(self):
        """ Test user CRUD form """

        # Set current user to Admin1
        # ==========================
        self.request.user = self.test_user1

        # Check empty form
        uform = G3WUserForm(request=self.request)
        self.assertFalse(uform.is_valid())

        # Create a admin 1
        form_data = {
            'username': 'admin01_test',
            'password1': self.users_password,
            'password2': self.users_password,
            'is_active': True,
            'is_superuser': True,
            'is_staff': True,
            'groups': [self.main_roles[G3W_EDITOR1].pk], # required also fro admin1 and admin2
            'backend': USER_BACKEND_DEFAULT

        }

        uform = G3WUserForm(request=self.request, data=form_data)
        self.assertTrue(uform.is_valid())
        uform.save()

        u = User.objects.get(username='admin01_test')
        self.assertTrue(u.is_superuser)
        self.assertTrue(u.is_staff)
        self.assertTrue(u.is_active)

        # Check password is not changed making a login
        self.client.logout()
        login = self.client.login(username='admin01_test', password=self.users_password)
        self.assertTrue(login)
        self.client.logout()

        u.delete()
        del(u)

        # Create a admin level 2
        form_data = {
            'username': 'admin01_test',
            'password1': self.users_password,
            'password2': self.users_password,
            'is_active': True,
            'is_superuser': True,
            'is_staff': True,
            'groups': [self.main_roles[G3W_EDITOR1].pk],  # required also for admin1 and admin2
            'backend': USER_BACKEND_DEFAULT

        }

        uform = G3WUserForm(request=self.request, data=form_data)
        self.assertTrue(uform.is_valid())
        uform.save()

        u = User.objects.get(username='admin01_test')
        self.assertTrue(u.is_superuser)
        self.assertTrue(u.is_staff)

        # Check creation oh a sub directory inside settings.DATASOURCE_PATH
        self.assertFalse(os.path.exists(f"{settings.DATASOURCE_PATH}/{u.username}"))

        # Update user
        initial_data = copy.copy(form_data)
        form_data.update({
            'username': 'admin01_test_updated'
        })
        uform = G3WUserForm(request=self.request, data=form_data, initial=initial_data, instance=u)
        self.assertTrue(uform.is_valid())
        uform.save()

        # Check self constraint
        with self.assertRaises(ObjectDoesNotExist) as ex:
            u = User.objects.get(username='admin01_test')

        u = User.objects.get(username='admin01_test_updated')
        self.assertTrue(u.is_superuser)
        self.assertTrue(u.is_staff)

        # Check password is not changed making a login
        login = self.client.login(username='admin01_test_updated', password=self.users_password)
        self.assertTrue(login)
        self.client.logout()

        u.delete()
        del(u)

        form_data.update({
            'username': 'admin02_test',
            'is_staff': False
        })

        uform = G3WUserForm(request=self.request, data=form_data)
        self.assertTrue(uform.is_valid())
        uform.save()

        u = User.objects.get(username='admin02_test')
        self.assertTrue(u.is_superuser)
        self.assertFalse(u.is_staff)

        u.delete()
        del(u)

        # Work as admin level 2
        # =====================

        self.request.user = self.test_user2

        # Create a Admin2
        form_data = {
            'username': 'admin02_test',
            'password1': self.users_password,
            'password2': self.users_password,
            'is_active': True,
            'is_superuser': True,
            'is_staff': True,
            'groups': [self.main_roles[G3W_EDITOR1].pk],
            # required also for admin1 and admin2
            'backend': USER_BACKEND_DEFAULT
        }

        uform = G3WUserForm(request=self.request, data=form_data)
        self.assertTrue(uform.is_valid())
        uform.save()

        u = User.objects.get(username='admin02_test')

        # Check User is Editor level 1
        self.assertFalse(userHasGroups(u, [G3W_EDITOR1]))
        self.assertFalse(userHasGroups(u, [G3W_EDITOR2]))
        self.assertFalse(userHasGroups(u, [G3W_VIEWER1]))

        # Check Admin2 can't set a Admin1  but only another Admin2
        self.assertTrue(u.is_superuser)
        self.assertFalse(u.is_staff)

        # Check creation oh a sub directory inside settings.DATASOURCE_PATH
        self.assertFalse(os.path.exists(f"{settings.DATASOURCE_PATH}/{u.username}"))

        u.delete()
        del (u)

        # Create a Editor 1
        form_data = {
            'username': 'editor1_test',
            'password1': self.users_password,
            'password2': self.users_password,
            'is_active': True,
            'is_superuser': False,
            'is_staff': True,
            'groups': [self.main_roles[G3W_EDITOR1].pk, self.main_roles[G3W_VIEWER1].pk],  # required also for admin1 and admin2
            'backend': USER_BACKEND_DEFAULT
        }

        uform = G3WUserForm(request=self.request, data=form_data)
        self.assertTrue(uform.is_valid())
        uform.save()

        u = User.objects.get(username='editor1_test')

        # Check User is Editor level 1
        self.assertTrue(userHasGroups(u, [G3W_EDITOR1]))
        self.assertFalse(userHasGroups(u, [G3W_EDITOR2]))
        self.assertTrue(userHasGroups(u, [G3W_VIEWER1]))

        # Check Admin2 can't set a Admin1  but only another Admin2
        self.assertFalse(u.is_superuser)
        self.assertFalse(u.is_staff)

        # Check creation oh a sub directory inside settings.DATASOURCE_PATH
        self.assertTrue(os.path.exists(f"{settings.DATASOURCE_PATH}/{u.username}"))

        u.delete()
        del (u)

        # Work as editor level 1
        # =======================

        self.request.user = self.test_editor1

        # Create a Editor 2
        form_data = {
            'username': 'editor2_test',
            'password1': self.users_password,
            'password2': self.users_password,
            'is_active': True,
            'is_superuser': True,
            'is_staff': True,
            'groups': [self.main_roles[G3W_EDITOR2].pk],
            # required also for admin1 and admin2
            'backend': USER_BACKEND_DEFAULT
        }

        uform = G3WUserForm(request=self.request, data=form_data)
        self.assertTrue(uform.is_valid())
        uform.save()

        u = User.objects.get(username='editor2_test')

        # Check User is Editor level 2
        self.assertFalse(userHasGroups(u, [G3W_EDITOR1]))
        self.assertTrue(userHasGroups(u, [G3W_EDITOR2]))
        self.assertFalse(userHasGroups(u, [G3W_VIEWER1]))

        self.assertFalse(u.is_superuser)
        self.assertFalse(u.is_staff)

        u.delete()
        del (u)

        # Editor lavel 2 can't set a Editor level 1
        form_data.update({
            'groups': [self.main_roles[G3W_EDITOR1].pk]
        })

        uform = G3WUserForm(request=self.request, data=form_data)
        self.assertFalse(uform.is_valid())

    def test_user_form_constraints(self):
        """ Test user form constraints and ACL"""

        # Work ad admin1
        self.request.user = self.test_user1

        # TEST VALIDATION groups
        # ======================

        form_data = {
            'password1': self.users_password,
            'password2': self.users_password,
            'username': 'editor1_test_constraint',
            'is_active': True,
            'is_superuser': False,
            'is_staff': False,
            'groups': [],
            'backend': USER_BACKEND_DEFAULT

        }

        uform = G3WUserForm(request=self.request, data=form_data)
        self.assertFalse(uform.is_valid())
        self.assertIn('groups', uform.errors)
        self.assertEqual(uform.errors['groups'].data[0].code, 'required')

        # If admin option(is_superuser, is_staff) are checked
        # ---------------------------------------------------

        form_data = {
            'password1': self.users_password,
            'password2': self.users_password,
            'username': 'editor1_test_constraint',
            'is_active': 'on',
            'is_superuser': 'on',
            'is_staff': 'off',
            'groups': [],
            'backend': USER_BACKEND_DEFAULT

        }

        uform = G3WUserForm(request=self.request, data=form_data)
        self.assertTrue(uform.is_valid())

        form_data = {
            'password1': self.users_password,
            'password2': self.users_password,
            'username': 'editor1_test_constraint',
            'is_active': 'on',
            'is_superuser': 'off',
            'is_staff': 'on',
            'groups': [],
            'backend': USER_BACKEND_DEFAULT

        }

        uform = G3WUserForm(request=self.request, data=form_data)
        self.assertTrue(uform.is_valid())

        form_data = {
            'password1': self.users_password,
            'password2': self.users_password,
            'username': 'editor1_test_constraint',
            'is_active': 'on',
            'is_superuser': 'on',
            'is_staff': 'on',
            'groups': [],
            'backend': USER_BACKEND_DEFAULT

        }

        uform = G3WUserForm(request=self.request, data=form_data)
        self.assertTrue(uform.is_valid())



        # TEST CONSTRAINT ON GROUPS AND USER GROUPS
        # =========================================

        form_data = {
            'password1': self.users_password,
            'password2': self.users_password,
            'username': 'editor1_test_constraint',
            'is_active': True,
            'is_superuser': False,
            'is_staff': False,
            'groups': [self.main_roles[G3W_EDITOR1].pk, self.main_roles[G3W_EDITOR2].pk],
            'backend': USER_BACKEND_DEFAULT

        }

        uform = G3WUserForm(request=self.request, data=form_data)
        self.assertFalse(uform.is_valid())
        self.assertIn('groups', uform.errors)
        self.assertEqual(uform.errors['groups'].data[0].code, 'groups_invalid')

        # No editor1 and editor 2 at same time
        form_data.update({
            'username': 'editor1_test_constraint',
            'is_superuser': False,
            'is_staff': False,
            'groups': [self.main_roles[G3W_VIEWER1].pk],
            'user_groups_editor': [self.test_gu_editor1]
        })

        uform = G3WUserForm(request=self.request, data=form_data)
        self.assertFalse(uform.is_valid())
        self.assertIn('user_groups_editor', uform.errors)
        self.assertEqual(uform.errors['user_groups_editor'].data[0].code, 'user_groups_editor_invalid')

        # Work as Editor  level 1
        # Check owner users
        self.request.user = self.test_editor1

        # No editor1 and editor 2 at same time
        form_data.update({
            'username': 'editor2_test_constraint',
            'is_superuser': False,
            'is_staff': False,
            'groups': [self.main_roles[G3W_EDITOR2].pk],
            'user_groups_editor': []
        })

        uform = G3WUserForm(request=self.request, data=form_data)

        # Editor 1 can set only edito level 2 and viewer level 1
        self.assertEqual(len(uform.fields['groups'].queryset), 2)
        self.assertEqual(set(uform.fields['groups'].queryset),
                         set([self.main_roles[G3W_EDITOR2], self.main_roles[G3W_VIEWER1]]))

        self.assertEqual(len(uform.fields['user_groups_editor'].queryset), 0)
        self.assertEqual(len(uform.fields['user_groups_viewer'].queryset), 0)

        # Create user_groups for test_editor1
        setup_testing_user_relations(self)

        self.request.user = self.test_editor1_2

        uform = G3WUserForm(request=self.request, data=form_data)

        self.assertEqual(len(uform.fields['user_groups_editor'].queryset), 1)
        self.assertEqual(len(uform.fields['user_groups_viewer'].queryset), 1)

    def test_user_groups_form_crud(self):
        """ Test user groups CRUD form """

        # Empty form
        gform = G3WUserGroupForm(request=self.request)
        self.assertFalse(gform.is_valid())

        # Create a User Group
        form_data = {
            'name': 'editor user group test',
            'role': 'editor'
        }

        gform = G3WUserGroupForm(request=self.request, data=form_data)
        self.assertTrue(gform.is_valid())
        gform.save()

        g = AuthGroup.objects.get(name='editor user group test')
        g.delete()

        # Check with G3W-SUITE system roles:
        form_data.update({
            'name': G3W_EDITOR1
        })

        gform = G3WUserGroupForm(request=self.request, data=form_data)
        self.assertFalse(gform.is_valid())
        self.assertIn('name', gform.errors)
        self.assertEqual(gform.errors['name'].data[0].code, 'unique')

        # Users management by Users Group form
        # =====================================

        # Create a newone User Group
        gusers =  [self.test_viewer1, self.test_viewer1_3]
        form_data = {
            'name': 'editor user group test with user management',
            'role': 'viewer',
            'gusers': [u.pk for u in gusers]
        }

        gform = G3WUserGroupForm(request=self.request, data=form_data)
        self.assertTrue(gform.is_valid())
        gform.save()

        ug = UserGroup.objects.get(name='editor user group test with user management')
        self.assertEqual([u.pk for u in gusers].sort(), [u.pk for u in ug.user_set.all()].sort())

        # Update User Group
        gusers2 = [self.test_viewer1_2, self.test_viewer1_3]
        form_data = {
            'name': 'editor user group test with user management',
            'role': 'viewer',
            'gusers': [u.pk for u in gusers2]
        }

        gform = G3WUserGroupForm(request=self.request, data=form_data, instance=ug, initial={
            'name': 'editor user group test with user management',
            'role': 'viewer',
            'gusers': [str(u.pk) for u in gusers]
        })
        self.assertTrue(gform.is_valid())
        gform.save()

        self.assertEqual([gu.pk for gu in gusers2].sort(), [gu.pk for gu in ug.user_set.all()].sort())

        # Update User Group with wrong user
        gusers2 = [self.test_viewer1_2, self.test_viewer1_3, self.test_editor1]
        form_data = {
            'name': 'editor user group test with user management',
            'role': 'viewer',
            'gusers': [u.pk for u in gusers2]
        }

        gform = G3WUserGroupForm(request=self.request, data=form_data, instance=ug, initial={
            'name': 'editor user group test with user management',
            'role': 'viewer',
            'gusers': [str(u.pk) for u in gusers]
        })
        self.assertFalse(gform.is_valid())

















