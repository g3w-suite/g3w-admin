# coding=utf-8
""""Main test API for qtimeseries module

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-12-02'
__copyright__ = 'Copyright 2015 - 2021, Gis3w'

from django.urls import reverse
from .base import QTimeSeriesBaseTest
import json
import datetime


class QTimeSeriesAPITestAPI(QTimeSeriesBaseTest):

    def test_initconfig_plugin_start(self):
        """Test data added to API client config"""

        response = self._testApiCall('group-map-config',
                      args=[self.project_group.slug, 'qdjango', self.project_raster.instance.pk])

        jcontent = json.loads(response.content)

        # check qplotly into plugins section
        self.assertTrue('qtimeseries' in jcontent['plugins'])

        plugin = jcontent['plugins']['qtimeseries']

        self.assertEqual(plugin['gid'], 'qdjango:{}'.format(
            self.project_raster.instance.pk))

        self.assertEqual(len(plugin['layers']), 0)

    def test_config_rest_client(self):
        """
        Test config API REST
        """

        response = self._testApiCall('group-project-map-config',
                                     args=[self.project_group.slug, 'qdjango', self.project_raster.instance.pk])

        jcontent = json.loads(response.content)
        self.assertEqual(len(jcontent['layers']), 1)
        self.assertTrue('qtimeseries' in jcontent['layers'][0])

        qts = jcontent['layers'][0]['qtimeseries']
        self.assertEqual(qts["mode"], "MeshTemporalRangeFromDataProvider")
        self.assertEqual(qts["start_date"], "1948-01-01T00:00:00Z")
        self.assertEqual(qts["end_date"], "2022-02-01T00:00:00Z")

        response = self._testApiCall('group-project-map-config',
                                     args=[self.project_group.slug, 'qdjango', self.project_raster_2.instance.pk])

        jcontent = json.loads(response.content)
        self.assertEqual(len(jcontent['layers']), 1)
        self.assertTrue('qtimeseries' in jcontent['layers'][0])

        qts = jcontent['layers'][0]['qtimeseries']
        self.assertEqual(qts["mode"], "MeshTemporalRangeFromDataProvider")
        self.assertEqual(qts["start_date"], "2022-08-15T18:40:00Z")
        self.assertEqual(qts["end_date"], "2022-08-15T19:00:00Z")
















