# coding=utf-8
""""
    Test views for module client
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-04-18'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'


from django.test import Client
from django.urls import reverse
from guardian.shortcuts import assign_perm
from qdjango.models import ProjectMapUrlAlias
from core.models import GeneralSuiteData
from .test_api import ClientApiTest


class ClientViewsTest(ClientApiTest):

    def setUp(self):
        super(ClientViewsTest, self).setUp()

        self.client = Client()

    def test_clientview(self):
        """ Testing  main client view """

        url = reverse('group-project-map', args=['gruppo-1', 'qdjango', '1'])

        # No login
        response = self.client.get(url)
        self.assertEqual(response.status_code, 302)

        # Login as viewer without permissions: 403 permission denied
        self.assertTrue(self.client.login(username=self.test_viewer1.username, password=self.test_viewer1.username))
        self.client.get(url)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 403)

        # Test ACL on project
        assign_perm('view_project', self.test_viewer1, self.prj_test)
        self.client.get(url)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        self.client.logout()

        # Login as admin1
        self.assertTrue(self.client.login(username=self.test_admin1.username, password=self.test_admin1.username))
        self.client.get(url)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        self.client.logout()

    def test_client_map_alias_view(self):
        """ Test aliasing map url """

        # Create an alias:
        alias = ProjectMapUrlAlias(app_name='qdjango', project_id=self.prj_test.pk, alias='url_alias_map_test')
        alias.save()

        url_alias = reverse('group-project-map-alias', args=['url_alias_map_test'])
        url = url = reverse('group-project-map', args=['gruppo-1', 'qdjango', '1'])

        # Login as admin1
        self.assertTrue(self.client.login(username=self.test_admin1.username, password=self.test_admin1.username))

        self.client.get(url)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        self.client.get(url_alias)
        response_alias = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        self.assertEqual(response.content, response_alias.content)

        self.client.logout()

        # Test map not found
        url_alias = reverse('group-project-map-alias', args=['url_alias_map_test_note_exist'])
        response = self.client.get(url_alias)
        self.assertEqual(response.status_code, 404)

    def test_credits_view(self):
        """ Test for credits view """

        url = reverse('client-credits')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        generalsuitedata = GeneralSuiteData.objects.get()
        self.assertEqual(bytes(str(generalsuitedata.credits), encoding='utf-8'), response.content)


