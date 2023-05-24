# coding=utf-8
"""
    Test Core views module
.. note:: This program is free software; you can redistribute it and/or modify
     it under the terms of the Mozilla Public License 2.0.
"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2019-11-28'
__copyright__ = 'Copyright 2019, GIS3W'

from django.test.client import RequestFactory, Client
from django.urls import reverse, NoReverseMatch
from core.models import Group, G3WSpatialRefSys, MacroGroup
from .base import CoreTestBase
from copy import copy


class CoreViewsTest(CoreTestBase):

    def test_delete_group_view(self):
        """
        Testing delete group
        """

        # Create a group to delete
        group_data = {
            'name': 'Group to delete',
            'title': 'Group to delete',
            'header_logo_img': '',
            'srid': G3WSpatialRefSys.objects.get(auth_srid=4326)
        }
        group = Group(**group_data)
        group.save()

        # check 1 group on db
        dbgroups = Group.objects.all()
        self.assertEqual(len(dbgroups), 1)
        self.assertEqual(dbgroups[0].name, group_data['name'])

        url = reverse('group-delete', args=[group.slug])

        client = Client()
        self.assertTrue(client.login(username=self.test_user1.username, password=self.test_user1.username))
        response = client.post(url)

        self.assertEqual(response.status_code, 200)

        # check no groups into db
        dbgroups = Group.objects.all()
        self.assertEqual(len(dbgroups), 0)

        client.logout()

    def test_delete_macrogroup_view(self):
        """
        Testing delete macrogroup
        """

        # Create a macrogroup to delete
        macrogroup_data = {
            'name': 'MacroGroup to delete',
            'title': 'MacroGroup to delete',
            'logo_img': ''
        }
        macrogroup = MacroGroup(**macrogroup_data)
        macrogroup.save()

        # check 1 macrogroup on db
        dbgmacrogropus = MacroGroup.objects.all()
        self.assertEqual(len(dbgmacrogropus), 1)
        self.assertEqual(dbgmacrogropus[0].name, macrogroup_data['name'])

        url = reverse('macrogroup-delete', args=[macrogroup.slug])

        client = Client()
        self.assertTrue(client.login(username=self.test_user1.username, password=self.test_user1.username))
        response = client.post(url)

        self.assertEqual(response.status_code, 200)

        # check no macrogroup into db
        dbgmacrogropus =MacroGroup.objects.all()
        self.assertEqual(len(dbgmacrogropus), 0)

        client.logout()

    def test_generasuitedata_view(self):
        """ Check GeneralDataSuite view """

        client = Client()

        # Check only admin can access
        # No login: loginrequired return redircte to login page 302
        url = reverse('generaldata-update')

        response = client.get(url)
        self.assertEqual(response.status_code, 302)

        # Check editor level 1
        # Not permission return 403
        self.assertTrue(client.login(username=self.test_editor1.username, password=self.test_editor1.username))
        response = client.get(url)
        self.assertEqual(response.status_code, 403)

        client.logout()

        # Check Admin
        # Has access response 200
        self.assertTrue(client.login(username=self.test_user1.username, password=self.test_user1.username))
        response = client.get(url)
        self.assertEqual(response.status_code, 200)


class CoreViewsActivateDeactivateTest(CoreTestBase):


    # These are stored in core module
    fixtures = CoreTestBase.fixtures + [
        # except for this one which is in qdjango:
        "G3WSampleProjectAndGroup.json",
    ]

    def test_activate_deactivate_group_view(self):

        # Deactivate
        # -------------------------------------------------
        group = Group.objects.get(slug='gruppo-1')
        self.assertTrue(group.is_active)

        # Check every projects of the groups
        for app, p in group.getProjects():
            self.assertTrue(p.is_active)

        url = reverse('group-deactive', args=['gruppo-1'])
        self.assertTrue(self.client.login(username=self.test_user1.username, password=self.test_user1.username))
        response = self.client.post(url)

        self.assertEqual(response.status_code, 200)

        group = Group.objects.get(slug='gruppo-1')
        self.assertFalse(group.is_active)

        # Check every projects of the groups
        for app, p in group.getProjects():
            self.assertFalse(p.is_active)

        # Activate
        # -------------------------------------------------
        url = reverse('group-active', args=['gruppo-1'])
        response = self.client.post(url)

        self.assertEqual(response.status_code, 200)

        group = Group.objects.get(slug='gruppo-1')
        self.assertTrue(group.is_active)

        # Check every projects of the groups
        for app, p in group.getProjects():
            self.assertTrue(p.is_active)

        self.client.logout()
