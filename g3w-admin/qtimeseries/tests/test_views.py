# coding=utf-8
""""Test module for qtimeseries views.

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2021-12-03'
__copyright__ = 'Copyright 2015 - 2021, Gis3w'


from django.core.exceptions import ObjectDoesNotExist
from qdjango.urls import reverse
from guardian.shortcuts import assign_perm
from qtimeseries.models import QRasterTimeSeriesLayer
from .base import QTimeSeriesBaseTest


class QTimeSeriesViewsTestAPI(QTimeSeriesBaseTest):
    """Testing module views"""

    def test_raster_layer_active(self):
        """Test view to activate raster netcdf layer"""

        netcdf_layer_id = 'air_sig995_2012_bb4a605a_1b9c_46d5_89bf_df42b0172643'
        netcdf_layer = self.project_raster.instance.layer_set.filter(
            qgs_layer_id=netcdf_layer_id)[0]

        # Not activated
        with self.assertRaises(ObjectDoesNotExist) as ex:
            QRasterTimeSeriesLayer.objects.get(layer_id=netcdf_layer.pk)

        # Test ONLY POST
        # TEST activate/deactivate raster time series

        # ACTIVATE
        data = {
            'active': 'on'
        }

        self.assertTrue(self.client.login(username=self.test_admin1.username, password=self.test_admin1.username))

        url = reverse('qtimeseries-raster-layer-activate', args=[
            self.project_raster.instance.pk,
            netcdf_layer.pk
        ])

        response = self.client.post(url, data=data)

        # Redirect if correct
        self.assertTrue(response.status_code, 302)

        raster_layers = QRasterTimeSeriesLayer.objects.filter(layer_id=netcdf_layer.pk)
        self.assertTrue(len(raster_layers) == 1)

        # DEACTIVATE
        data = {}

        self.assertTrue(self.client.login(username=self.test_admin1.username, password=self.test_admin1.username))

        response = self.client.post(url, data=data)

        # Redirect if correct
        self.assertTrue(response.status_code, 302)

        raster_layers = QRasterTimeSeriesLayer.objects.filter(layer_id=netcdf_layer.pk)
        self.assertTrue(len(raster_layers) == 0)

        self.client.logout()

        # Test ACL
        self.assertTrue(self.client.login(username=self.test_editor1.username, password=self.test_editor1.username))

        response = self.client.post(url, data=data)
        self.assertTrue(response.status_code, 403)

        # Give permission on project to Editor1
        assign_perm('change_project', self.test_editor1, self.project_raster.instance)

        data = {
            'active': 'on'
        }

        response = self.client.post(url, data=data)
        self.assertTrue(response.status_code, 302)

        raster_layers = QRasterTimeSeriesLayer.objects.filter(layer_id=netcdf_layer.pk)
        self.assertTrue(len(raster_layers) == 1)