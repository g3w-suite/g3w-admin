# coding=utf-8
""""

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-09-16'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'


from django.urls import reverse
from qdjango.tests.base import QdjangoTestBase, CoreGroup, File, G3WSpatialRefSys, QgisProject, setup_testing_user
from rest_framework.test import APIClient
from qplotly.utils import get_qplotlywidget_for_project
from qplotly.models import QplotlyWidget
from qplotly.utils.models import get_qplotlywidgets4layer
from .test_utils import CURRENT_PATH, QGS_FILE, TEST_BASE_PATH, get_data_plotly_settings_from_file
import json


class QplotlyTestAPI(QdjangoTestBase):

    @classmethod
    def setUpClass(cls):
        super(QplotlyTestAPI, cls).setUpClass()

        cls.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        # main project group
        cls.project_group = CoreGroup(name='Group1', title='Group1', header_logo_img='',
                                      srid=G3WSpatialRefSys.objects.get(auth_srid=4326))

        cls.project_group.save()

        qgis_project_file = File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_FILE), 'r', encoding='utf-8'))

        # Replace name property with only file name without path to simulate UploadedFileWithId instance.
        qgis_project_file.name = qgis_project_file.name.split('/')[-1]
        cls.project = QgisProject(qgis_project_file)
        cls.project.group = cls.project_group
        cls.project.save()
        qgis_project_file.close()

    @classmethod
    def tearDownClass(cls):
        cls.project.instance.delete()
        super().tearDownClass()

    def _testApiCall(self, view_name, args, kwargs={}):
        """Utility to make test calls for admin01 user"""

        path = reverse(view_name, args=args)
        if kwargs:
            path += '?'
            parts = []
            for k,v in kwargs.items():
                parts.append(k + '=' + v)
            path += '&'.join(parts)

        # Auth
        self.assertTrue(self.client.login(username='admin01', password='admin01'))
        response = self.client.get(path)
        self.assertEqual(response.status_code, 200)
        self.client.logout()
        return response

    def test_save_settings(self):
        """test saving data plotly settings into db"""

        qplotly_widgets = get_qplotlywidget_for_project(self.project.instance)
        self.assertEqual(len(qplotly_widgets), 1)

        self.assertEqual(qplotly_widgets[0].project, self.project.instance)

    def test_initconfig_plugin_start(self):
        """Test data added to API client config"""

        response = self._testApiCall('group-map-config',
                      args=[self.project_group.slug, 'qdjango', self.project.instance.pk])

        jcontent = json.loads(response.content)

        # check qplotly into plugins section
        self.assertTrue('qplotly' in jcontent['group']['plugins'])

        plugin = jcontent['group']['plugins']['qplotly']

        self.assertEqual(plugin['gid'], 'qdjango:{}'.format(
            self.project.instance.pk))

        self.assertEqual(plugin['jsscripts'],
                         ["/static/qplotly/polyfill.min.js", "/static/qplotly/plotly-1.52.2.min.js"])

        self.assertEqual(len(plugin['plots']), 1)

        plugin_plot = plugin['plots'][0]

        self.assertEqual(plugin_plot['qgs_layer_id'], 'countries_d53dfb9a_98e1_4196_a601_eed9a33f47c3')
        self.assertEqual(plugin_plot['id'], get_qplotlywidget_for_project(self.project.instance)[0].pk)
        self.assertFalse(plugin_plot['selected_features_only'])
        self.assertFalse(plugin_plot['visible_features_only'])

        self.assertEqual(plugin_plot['plot']['type'], 'histogram')
        self.assertTrue('layout' in plugin_plot['plot'])

    def test_trace_api(self):
        """/qplotly/api/trace API"""

        qplotlywidget_id = QplotlyWidget.objects.all()[0].pk

        response = self._testApiCall('qplotly-api-trace', args=[
            self.project.instance.pk,
            qplotlywidget_id
        ])

        jcontent = json.loads(response.content)
        trace_data = json.loads(response.content)['data']

    def test_get_qplotlywidgets4layer(self):
        """Test for homonimous util function"""

        layer_city = self.project.instance.layer_set.get(qgs_layer_id='countries_d53dfb9a_98e1_4196_a601_eed9a33f47c3')

        widgets = get_qplotlywidgets4layer(layer_city)

        self.assertEqual(len(widgets), 1)


