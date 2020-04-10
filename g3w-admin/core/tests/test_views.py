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
from core.models import Group, G3WSpatialRefSys
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
        dbprojects = Group.objects.all()
        self.assertEqual(len(dbprojects), 1)
        self.assertEqual(dbprojects[0].name, group_data['name'])

        url = reverse('group-delete', args=[group.slug])

        client = Client()
        self.assertTrue(client.login(username=self.test_user1.username, password=self.test_user1.username))
        response = client.post(url)

        self.assertEqual(response.status_code, 200)

        # check only one project into db
        dbprojects = Group.objects.all()
        self.assertEqual(len(dbprojects), 0)

        client.logout()
