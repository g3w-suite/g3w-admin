# coding=utf-8
""""
    Test usermanage module views
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-04-14'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from django.test import Client
from django.urls import reverse
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.models import Group as AuthGroup, User
from .base import BaseUsermanageTestCase
from .utils import setup_testing_user_relations, assign_perm, G3W_EDITOR1


class UsermanageViewsTest(BaseUsermanageTestCase):

    def setUp(self) -> None:
        super(UsermanageViewsTest, self).setUp()
        setup_testing_user_relations(self)
        self.client = Client()

    def test_users(self):
        """ Test views list and other and ACL"""

        # Login required
        url = reverse('user-list')
        url_newone = reverse('user-add')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 302)

        # Login as Admin1
        self.assertTrue(self.client.login(username=self.test_user1.username, password=self.test_user1.username))
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        # Check object_list
        object_list = response.context_data['object_list']

        # Every test users:
        # test_user1, test_user2, test_editor1...
        self.assertEqual(len(object_list), 11)

        # Admin1 can create new user
        response = self.client.get(url_newone)
        self.assertEqual(response.status_code, 200)
        self.client.logout()

        # Login as Editor1
        self.assertTrue(self.client.login(username=self.test_editor1.username, password=self.test_editor1.username))
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        # Check object_list
        object_list = response.context_data['object_list']

        # Every test users:
        # test_user1, test_user2, test_editor1...
        self.assertEqual(len(object_list), 0)

        # Editor1 can create new user
        response = self.client.get(url_newone)
        self.assertEqual(response.status_code, 200)
        self.client.logout()

        # Login as Editor1: test_editor1_2
        self.assertTrue(self.client.login(username=self.test_editor1_2.username, password=self.test_editor1_2.username))
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        # Check object_list
        object_list = response.context_data['object_list']

        # Every test users:
        # test_user1, test_user2, test_editor1...
        self.assertEqual(len(object_list), 3)

        # Login as Editor2
        # only his account
        self.assertTrue(self.client.login(username=self.test_editor2.username, password=self.test_editor2.username))
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        # Check object_list
        object_list = response.context_data['object_list']

        # Every test users:
        # test_user1, test_user2, test_editor1...
        self.assertEqual(len(object_list), 0)

        # Editor2 can't create new user
        response = self.client.get(url_newone)
        self.assertEqual(response.status_code, 403)
        self.client.logout()

        # Login as Viewer1
        # only his account
        self.assertTrue(self.client.login(username=self.test_viewer1.username, password=self.test_viewer1.username))
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        # Viewer1 can't create new user
        response = self.client.get(url_newone)
        self.assertEqual(response.status_code, 403)
        self.client.logout()

    def test_user_groups(self):
        """ Test views list and other and ACL for user groups """

        # Login required
        url = reverse('user-group-list')
        url_newone = reverse('user-group-add')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 302)

        # Login as Admin1
        self.assertTrue(self.client.login(username=self.test_user1.username, password=self.test_user1.username))
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        # Check object_list
        object_list = response.context_data['object_list']

        # Every test groups:
        # test_gu_editor1, test_gu_editor2, ... , test_gu_editor1_E1_2, ...
        self.assertEqual(len(object_list), 6)

        self.client.logout()

        # Login as Editor1
        self.assertTrue(self.client.login(username=self.test_editor1.username, password=self.test_editor1.username))
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        # Check object_list
        object_list = response.context_data['object_list']

        self.assertEqual(len(object_list), 0)

        # Editor1 can add new one
        response = self.client.get(url_newone)
        self.assertEqual(response.status_code, 200)
        self.client.logout()

        # Login as Editor2: access denied for new one
        self.assertTrue(self.client.login(username=self.test_editor2.username, password=self.test_editor2.username))
        response = self.client.get(url_newone)
        self.assertEqual(response.status_code, 403)
        self.client.logout()

        # Login as Editor1.2
        self.assertTrue(self.client.login(username=self.test_editor1_2.username, password=self.test_editor1_2.username))
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        # Check object_list
        object_list = response.context_data['object_list']

        self.assertEqual(len(object_list), 2)
        self.client.logout()

    def test_users_delete(self):
        """ Test deleting user """

        # Create a user to delete
        u = User.objects.create_user(username='User to delete')
        url = reverse('user-delete', args=[u.pk])

        # No Login: redirect
        response = self.client.post(url)
        self.assertEqual(response.status_code, 302)

        # Viewer1 login: access denied
        self.assertTrue(self.client.login(username=self.test_viewer1.username, password=self.test_viewer1.username))
        response = self.client.post(url)
        self.assertEqual(response.status_code, 403)
        self.client.logout()

        # Editor1 login: access denied, because don't has permission on it
        self.assertTrue(self.client.login(username=self.test_editor1.username, password=self.test_editor1.username))
        response = self.client.post(url)
        self.assertEqual(response.status_code, 403)
        self.client.logout()

        # Admin login: can delete it
        self.assertTrue(self.client.login(username=self.test_user1.username, password=self.test_user1.username))
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)
        self.client.logout()

        with self.assertRaises(ObjectDoesNotExist) as ex:
            User.objects.get(pk=u.pk)

        # Create again for test for editor with permission
        u = User.objects.create_user(username='User to delete')
        url = reverse('user-delete', args=[u.pk])

        assign_perm('delete_user', self.test_editor1, u)

        self.assertTrue(self.client.login(username=self.test_editor1.username, password=self.test_editor1.username))
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)
        self.client.logout()

        with self.assertRaises(ObjectDoesNotExist) as ex:
            User.objects.get(pk=u.pk)

    def test_user_groups_delete(self):
        """ Test delete users groups """

        # Create  new group to delete
        gu = AuthGroup(name='new auth group to delete')
        gu.save()

        url = reverse('user-group-delete', args=[gu.pk])

        # No Login: redirect
        response = self.client.post(url)
        self.assertEqual(response.status_code, 302)

        # Viewer1 login: access denied
        self.assertTrue(self.client.login(username=self.test_viewer1.username, password=self.test_viewer1.username))
        response = self.client.post(url)
        self.assertEqual(response.status_code, 403)
        self.client.logout()

        # Editor1 login: access denied, because don't has permission on it
        self.assertTrue(self.client.login(username=self.test_editor1.username, password=self.test_editor1.username))
        response = self.client.post(url)
        self.assertEqual(response.status_code, 403)
        self.client.logout()

        # Admin login: can delete it
        self.assertTrue(self.client.login(username=self.test_user1.username, password=self.test_user1.username))
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)
        self.client.logout()

        with self.assertRaises(ObjectDoesNotExist) as ex:
            AuthGroup.objects.get(pk=gu.pk)

        # Create again for test for editor with permission
        gu = AuthGroup(name='new auth group to delete')
        gu.save()

        # Change url for new pk
        url = reverse('user-group-delete', args=[gu.pk])

        assign_perm('change_group', self.test_editor1, gu)

        self.assertTrue(self.client.login(username=self.test_editor1.username, password=self.test_editor1.username))
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)
        self.client.logout()

        with self.assertRaises(ObjectDoesNotExist) as ex:
            AuthGroup.objects.get(pk=gu.pk)

        # Test deleting main role/group core: G3W_EDITOR1, G3W_EDITOR2, ...
        gu = AuthGroup.objects.get(name=G3W_EDITOR1)
        url = reverse('user-group-delete', args=[gu.pk])

        self.assertTrue(self.client.login(username=self.test_user1.username, password=self.test_user1.username))
        response = self.client.post(url)
        self.assertEqual(response.status_code, 404)
        self.client.logout()











