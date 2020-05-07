# coding=utf-8
"""
    Test Qdjango views module
.. note:: This program is free software; you can redistribute it and/or modify
     it under the terms of the Mozilla Public License 2.0.
"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2019-11-28'
__copyright__ = 'Copyright 2019, GIS3W'

from django.test.client import RequestFactory, Client
from django.urls import reverse, NoReverseMatch
from qdjango.models import Project
from .base import QdjangoTestBase
from .utils import create_dff_project
from copy import copy


class QdjangoViewsTest(QdjangoTestBase):

    def test_qdjango_layers(self):
        """
        Test project layers list view
        :return: None
        """

        client = Client()
        self.assertTrue(client.login(username=self.test_user1.username, password=self.test_user1.username))

        url = reverse("qdjango-project-layers-list", args=[self.project_group.slug, self.project.instance.slug])

        response = client.get(url)
        self.assertEqual(response.status_code, 200)

        client.logout()

    def test_QdjangoLayerDataView(self):
        """ Test same name view class """

        client = Client()
        self.assertTrue(client.login(username=self.test_user1.username, password=self.test_user1.username))

        # get first layer of project
        layer = self.project.instance.layer_set.all()[0]

        # check initial contidion for params list
        data_post = {}
        parms_to_check = {
            'exclude_from_legend': 'exclude_from_legend',
            'download_layer': 'download',
            'external': 'external'
        }
        for p, a in parms_to_check.items():
            self.assertFalse(getattr(layer, a))
            data_post.update({p: 1})

        url = reverse('qdjango-project-layers-data-editing',
                      args=[self.project_group.slug, self.project.instance.slug, layer.pk])

        # check get not allowed
        response = client.get(url)
        self.assertEqual(response.status_code, 405)

        # check post params
        response = client.post(url, data=data_post)

        # reload layer from db
        layer.refresh_from_db()

        for p, a in parms_to_check.items():
            self.assertTrue(getattr(layer, a))

        client.logout()

    def test_qdjango_layer_widgets(self):
        """
        Test project layer widget list view
        :return: None
        """

        client = Client()
        self.assertTrue(client.login(username=self.test_user1.username, password=self.test_user1.username))

        # get first layer of project
        layer = self.project.instance.layer_set.all()[0]

        url = reverse("qdjango-project-layer-widgets", args=[
            self.project_group.slug,
            self.project.instance.slug,
            layer.slug
        ])

        response = client.get(url)
        self.assertEqual(response.status_code, 200)

        client.logout()

    def test_delete_project_view(self):
        """ Testing delete project """

        # make a copy of main project testing
        project_to_delete = copy(self.project)

        # change base properties
        project_to_delete.title = 'A project to delete'

        # make a db record copy
        mproject = copy(self.project.instance)
        mproject.title = project_to_delete.title
        mproject.pk = None
        mproject.save()

        # check 2 project on db
        dbprojects = Project.objects.all()
        self.assertEqual(len(dbprojects), 3)

        url = reverse('qdjango-project-delete', args=[self.project_group.slug, mproject.slug])

        client = Client()
        self.assertTrue(client.login(username=self.test_user1.username, password=self.test_user1.username))
        response = client.post(url)

        self.assertEqual(response.status_code, 200)

        # check only one project into db
        dbprojects = Project.objects.all()
        self.assertEqual(len(dbprojects), 2)
        self.assertTrue(dbprojects[0].pk, self.project.instance.pk)

        client.logout()








    '''
    def test_create_qdjango_project_view(self):

        uf = create_dff_project('qgis_file')

        client = Client()
        self.assertTrue(client.login(username=self.test_user1.username, password=self.test_user1.username))

        url = reverse('qdjango-project-add', args=[
            self.project_group.slug
        ])

        post_data = {
            'form_id': uf.form_id
        }

        response = client.post(url, post_data)
        self.assertEqual(response.status_code, 200)

        # Check project saved

        self.assertEqual(len(Project.objects.all()), 1)



        client.logout()
    '''
