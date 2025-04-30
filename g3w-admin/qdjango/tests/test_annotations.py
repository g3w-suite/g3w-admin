# coding=utf-8
""""Test for the GetPrint AnnotationsPrintFilter.

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2025-05-09'
__copyright__ = 'Copyright 2025, Gis3w'

import os
import json

from django.conf import settings
from django.test import Client, override_settings
from django.urls import reverse
from qdjango.apps import QGS_SERVER, get_qgs_project
from qdjango.models import Project
from .base import CURRENT_PATH, TEST_BASE_PATH, QdjangoTestBase
from qgis.PyQt.QtCore import QTemporaryDir
from qgis.PyQt.QtGui import QImage, QColor
from qgis.core import QgsMultiRenderChecker
from urllib.parse import quote_plus, urlencode


@override_settings(CACHES={
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'some',
    }
},
    LANGUAGE_CODE='en',
    LANGUAGES=(
        ('en', 'English'),
)
)
class TestAnnotations(QdjangoTestBase):
    """Test for the GetPrint AnnotationsPrintFilter."""


    def __test_annotations(self, method='get'):
        """Test the GetPrint annotations."""

        ows_url = reverse('OWS:ows',
                          kwargs={'group_slug': self.project310.instance.group.slug,
                                  'project_type': 'qdjango',
                                  'project_id': self.project310.instance.id}
                          )

        c = Client()
        self.assertTrue(c.login(username='admin01', password='admin01'))

        with open(os.path.join(CURRENT_PATH, 'qdjango', 'tests', 'data', 'annotations', 'annotations.geojson'), 'r') as f:

            annotations = json.load(f)
            annotations_text = json.dumps(annotations)

            url_data = {
                "SERVICE": "WMS",
                "VERSION": "1.3.0",
                "REQUEST": "GetPrint",
                "TEMPLATE": "A4",
                "DPI": "96",
                "STYLES": "predefinito",
                "LAYERS": "Countries",
                "FORMAT": "png",
                "CRS": "EPSG:4326",
                "filtertoken": "undefined",
                "map0:SCALE": "10000000",
                "map0:EXTENT": "36.89659055406611,4.076705735113007,47.4869571772545,21.1215561582328",
                "map0:ROTATION": "0",
                "Print": "Print",
                'ANNOTATIONS': annotations_text,
            }

            response = c.get(ows_url, url_data) if method == 'get' else c.post(ows_url, urlencode(url_data), content_type='application/x-www-form-urlencoded')

            self.assertEqual(response.status_code, 200)
            # Save the response to a temporary pdf file
            temp_dir = QTemporaryDir()
            out_file = temp_dir.path() + '/annotations_test_output.png'
            with open(out_file, 'wb') as f:
                f.write(response.content)

            # Check the output file
            image = QImage(out_file)
            # Check px values
            # Polygon stroke
            self.assertEqual(image.pixelColor(569, 159), QColor(0, 0, 255))
            # Polygon fill
            self.assertEqual(image.pixelColor(570, 172), QColor(255, 255, 0))
            # Polygon Text
            self.assertEqual(image.pixelColor(579, 184), QColor(0, 255, 0))

            # Check the point stroke
            self.assertEqual(image.pixelColor(541, 227), QColor(0, 255, 0))
            # Check the point fill
            self.assertEqual(image.pixelColor(547, 227), QColor(0, 255, 255))
            # Check the point text
            self.assertEqual(image.pixelColor(551, 236), QColor(255, 0, 0))

            # Check the line stroke
            self.assertEqual(image.pixelColor(577, 260), QColor(0, 255, 0))
            # Check the line text
            self.assertEqual(image.pixelColor(613, 256), QColor(0, 255, 0))

            # Check the label text
            self.assertEqual(image.pixelColor(620, 259), QColor(0, 255, 255))


    def test_annotations_get(self):
        """Test the GetPrint annotations."""
        self.__test_annotations(method='get')

    def test_annotations_post(self):
        """Test the GetPrint annotations."""
        self.__test_annotations(method='post')





