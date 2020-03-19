# coding=utf-8
"""
    Test Qdjango OWS capabilities
.. note:: This program is free software; you can redistribute it and/or modify
     it under the terms of the Mozilla Public License 2.0.
"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2019-11-28'
__copyright__ = 'Copyright 2019, GIS3W'


from .base import QdjangoTestBase
from django.test.client import Client
from django.urls import reverse
from PIL import Image
import io


class QdjangoOWSTest(QdjangoTestBase):

    def test_wms_request(self):
        """
        Test main WMS request
        GetCapabilities GetLegendGraphics GetMap
        """

        client = Client()
        self.assertTrue(client.login(username=self.test_user_admin1.username, password=self.test_user_admin1.username))

        # without REQUEST value
        # ---------------------------------
        req_awaited = '<ServiceExceptionReport version="1.3.0" xmlns="http://www.opengis.net/ogc">\n ' \
                      '<ServiceException code="Service configuration error">Service unknown or unsupported</ServiceException>\n' \
                       '</ServiceExceptionReport>\n'

        url = reverse('OWS:ows', args=[self.project_group.pk, 'qdjango', self.project.instance.pk])

        response = client.get(url)
        self.assertEqual(response.status_code, 200)

        self.assertEqual(response.content.decode('utf-8'), req_awaited)

        # REQUEST = GetCapabilities
        # ---------------------------------
        url = reverse('OWS:ows', args=[self.project_group.pk, 'qdjango', self.project.instance.pk])+\
              '?REQUEST=GetCapabilities&SERVICE=WMS&VERSION=1.3.0'

        response = client.get(url)
        self.assertEqual(response.status_code, 200)

        # REQUEST = GetLegendGraphic
        # ---------------------------------
        url = reverse('OWS:ows', args=[self.project_group.pk, 'qdjango', self.project.instance.pk]) + \
              '?REQUEST=GetLegendGraphic&SERVICE=WMS&VERSION=1.3.0&' \
              'SLD_VERSION=1.1.0&WIDTH=300&FORMAT=image/png&TRANSPARENT=true&ITEMFONTCOLOR=white&' \
              'LAYERFONTCOLOR=white&LAYERTITLE=true&ITEMFONTSIZE=10&&LAYER=spatialite_points'

        response = client.get(url)
        self.assertEqual(response.status_code, 200)

        image = Image.open(io.BytesIO(response.content))
        self.assertEqual(image.format, 'PNG')

        # REQUEST = GetMap
        # ---------------------------------
        url = reverse('OWS:ows', args=[self.project_group.pk, 'qdjango', self.project.instance.pk]) + \
              '?REQUEST=GetLegendGraphic&SERVICE=WMS&VERSION=1.3.0&' \
              'FORMAT=image%2Fpng&TRANSPARENT=true&LAYERS=spatialite_points&SLD_VERSION=1.1.0&' \
              'DPI=96&CRS=EPSG%3A4326&STYLES=&WIDTH=876&HEIGHT=900&' \
              'BBOX=3.0080193681475578%2C-33.81013769797853%2C111.2967166214596%2C71.59086096191184'

        response = client.get(url)
        self.assertEqual(response.status_code, 200)

        image = Image.open(io.BytesIO(response.content))
        self.assertEqual(image.format, 'PNG')






