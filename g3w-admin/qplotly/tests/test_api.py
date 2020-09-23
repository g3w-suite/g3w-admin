# coding=utf-8
""""

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-09-16'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'


from django.urls import reverse
from django.test.client import encode_multipart
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

    def _testApiCall(self, view_name, args, kwargs={}, data=None, method='POST'):
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
        if data:
            if method == 'POST':
                response = self.client.post(path, data=data)
            elif method == 'PUT':
                response = self.client.put(path, data=data, content_type='application/json')
            elif method == 'DELETE':
                response = self.client.delete(path)
            print(response.content)
            self.assertTrue(response.status_code in (200, 201))
        else:
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

    def _check_constraints(self, jcontent):
        self.assertEqual(jcontent['results'][0]['pk'], 1)
        self.assertFalse(jcontent['results'][0]['selected_features_only'])
        self.assertFalse(jcontent['results'][0]['visible_features_only'])
        self.assertEqual(jcontent['results'][0]['type'], 'histogram')
        self.assertTrue(len(jcontent['results'][0]['layers'])==1)

    def test_widgets(self):
        """Test API"""

        jcontent = json.loads(self._testApiCall('qplotly-widget-api-list', [], {}).content)
        self.assertEqual(jcontent['count'], 1)
        self._check_constraints(jcontent)
        layer_pk = jcontent['results'][0]['layers'][0]

        jcontent = json.loads(self._testApiCall('qplotly-widget-api-filter-by-layer-id', [layer_pk], {}).content)
        self.assertEqual(jcontent['count'], 1)
        self._check_constraints(jcontent)

        # TEST CREATE
        # -----------
        data = jcontent['results'][0]
        del(data['pk'])

        # change type for test
        data['type'] = 'pie'
        jcontent = json.loads(self._testApiCall('qplotly-widget-api-list', [], {}, data=data).content)
        self.assertEqual(jcontent['pk'], 2)
        self.assertEqual(jcontent['type'], 'pie')

        jcontent = json.loads(self._testApiCall('qplotly-widget-api-filter-by-layer-id', [layer_pk], {}).content)
        self.assertEqual(jcontent['count'], 2)

        # TEST UPDATE
        # -----------

        # change type for test
        data['pk'] = 2
        data['type'] = 'scatter'
        jcontent = json.loads(self._testApiCall('qplotly-widget-api-detail', [data['pk']], {}, data=data, method='PUT').content)
        self.assertEqual(jcontent['pk'], 2)
        self.assertEqual(jcontent['type'], 'scatter')

        jcontent = json.loads(self._testApiCall('qplotly-widget-api-filter-by-layer-id', [layer_pk], {}).content)
        self.assertEqual(jcontent['count'], 2)
        self.assertEqual(jcontent['results'][1]['type'], 'scatter')

        # TEST DELETE
        # -----------

        jcontent = json.loads(
            self._testApiCall('qplotly-widget-api-detail', [data['pk']], {}, data=None, method='DELETE').content)





