# coding=utf-8
"""" Test Qes API for editing and other

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2025-05-23'
__copyright__ = 'Copyright 2015 - 2025, Gis3w'


from django.urls import reverse
from django.core.files import File
from editing.tests.test_models import QGS_EDITING_DB, QGS_EDITING_DB_BACKUP
from qdjango.utils.data import QgisProject
from core.models import Group as CoreGroup, G3WSpatialRefSys
from .base import QesTesBase, override_settings
import os
import shutil

CURRENT_PATH = os.getcwd()
TEST_BASE_PATH = '/editing/tests/data/'
DATASOURCE_PATH = f'{CURRENT_PATH}{TEST_BASE_PATH}'
QGS_EDITING_FILE = 'editing_test_qgis334.qgs'

@override_settings(CACHES={
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'some',
    }
},
    DATASOURCE_PATH=DATASOURCE_PATH,
    LANGUAGE_CODE='en',
    LANGUAGES=(
        ('en', 'English'),
)
)
class TestQesAPI(QesTesBase):
    """ Test API for editing and other """

    def setUp(self):

        # Reset DB data
        shutil.copy(f'{CURRENT_PATH}{TEST_BASE_PATH}{QGS_EDITING_DB_BACKUP}',
                    f'{CURRENT_PATH}{TEST_BASE_PATH}{QGS_EDITING_DB}')

        self.project_group = CoreGroup(name='Group1', title='Group1', header_logo_img='',
                                       srid=G3WSpatialRefSys.objects.get(auth_srid=4326))
        self.project_group.save()

        # Load QGIS editing project
        qgis_project_file = File(open('{}{}{}'.format(
            CURRENT_PATH, TEST_BASE_PATH, QGS_EDITING_FILE), 'r', encoding='UTF8'))
        self.editing_project = QgisProject(qgis_project_file)
        self.editing_project.group = self.project_group
        self.editing_project.save()
        qgis_project_file.close()

    def test_editing_action(self):
        """
        Test editing action on create update and delete
        """

        cities_layer_id = 'cities_54d40b01_2af8_4b17_8495_c5833485536e'
        cities_layer = self.editing_project.instance.layer_set.filter(
            qgs_layer_id=cities_layer_id)[0]

