# coding=utf-8
""""Main test API for qtimeseries module

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-12-02'
__copyright__ = 'Copyright 2015 - 2021, Gis3w'

from django.urls import reverse
from qtimeseries.models import QRasterTimeSeriesLayer
from .base import QTimeSeriesBaseTest
import json
import datetime


class QTimeSeriesAPITestAPI(QTimeSeriesBaseTest):

    def test_initconfig_plugin_start(self):
        """Test data added to API client config"""

        # Enable raster layer for time series
        # With star and end date not comming from original netcdf data
        QRasterTimeSeriesLayer.objects.create(
            layer=self.project_raster.instance.layer_set.all()[0],
            start_date=datetime.date(2021, 1, 1),
            end_date=datetime.date(2021, 12, 31)

        )

        response = self._testApiCall('group-map-config',
                      args=[self.project_group.slug, 'qdjango', self.project_raster.instance.pk])

        jcontent = json.loads(response.content)

        # check qplotly into plugins section
        self.assertTrue('qtimeseries' in jcontent['group']['plugins'])

        plugin = jcontent['group']['plugins']['qtimeseries']

        self.assertEqual(plugin['gid'], 'qdjango:{}'.format(
            self.project_raster.instance.pk))

        self.assertEqual(len(plugin['layers']), 1)

        plugin_layer = plugin['layers'][0]

        self.assertEqual(plugin_layer['type'], 'raster')
        self.assertEqual(plugin_layer['id'], 'air_sig995_2012_bb4a605a_1b9c_46d5_89bf_df42b0172643')
        self.assertEqual(plugin_layer['start_date'], '2021-01-01')
        self.assertEqual(plugin_layer['end_date'], '2021-12-31')

    def test_qtimeseries_raster_serie_api(self):
        """ Test API return data about netcdf: number of band, list of bands etc."""


        def make_api_request():
            return self._testApiCall('qtimeseries-raster-serie-api', args=[self.project_raster.instance.pk,
                                           'air_sig995_2012_bb4a605a_1b9c_46d5_89bf_df42b0172643'])

        # NO qtimeserier activated for layer
        # {
        #     'result': False,
        #     'error': 'air_sig995_2012_bb4a605a_1b9c_46d5_89bf_df42b0172643 is not activated for time serie'
        # }
        response = make_api_request()
        jcontent = json.loads(response.content)

        self.assertFalse(jcontent['result'])
        self.assertEqual(jcontent['error'], 'air_sig995_2012_bb4a605a_1b9c_46d5_89bf_df42b0172643 is not activated for time serie')

        # Activate layer fo qtimeseries
        QRasterTimeSeriesLayer.objects.create(
            layer=self.project_raster.instance.layer_set.all()[0],
            start_date=datetime.date(2021, 1, 1),
            end_date=datetime.date(2021, 12, 31)
        )

        response = make_api_request()
        jcontent = json.loads(response.content)

        self.assertTrue(jcontent['result'])
        self.assertEqual(len(jcontent['dates']), 366)
        self.assertEqual(jcontent['dates'][0], '2000-01-01')
        self.assertEqual(jcontent['dates'][-1], '2000-12-31')
        self.assertEqual(jcontent['numberofbands'], 1)
        self.assertEqual(jcontent['numberofobservations'], 366)









