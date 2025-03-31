# coding=utf-8
"""Test base module for Qdjango module
.. note:: This program is free software; you can redistribute it and/or modify
     it under the terms of the Mozilla Public License 2.0.
"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2019-11.28'
__copyright__ = 'Copyright 2019, GIS3W'


import os
import shutil
from django.conf import settings
from django.test import TestCase, override_settings
from django.core.files import File
from django.core.exceptions import ValidationError
from django.urls import reverse
from django.db import IntegrityError
from core.models import Group as CoreGroup, G3WSpatialRefSys
from usersmanage.models import User, Group as UserGroup
from usersmanage.tests.utils import *
from qdjango.utils.data import QgisProject
from qdjango.models import Layer, Widget


CURRENT_PATH = os.getcwd()
TEST_BASE_PATH = '/qdjango/tests/data/'
DATASOURCE_PATH = '{}{}geodata'.format(CURRENT_PATH, TEST_BASE_PATH)
QGS2_FILE = 'gruppo-1_un-progetto.qgs'
QGS_FILE = 'gruppo-1_un-progetto_qgis310.qgs'
QGS310_FILE = 'g3wsuite_project_test_qgis310.qgs'
QGS310_WIDGET_FILE = 'qgis_attributes_widget_test_prj.qgs'
QGS316_THEME_FILE = 'project_themes_qgis316.qgs'
QGS328_THEME_FILE = 'project_themes_qgis328.qgs'
QGS340_THEME_FILE = 'project_themes_qgis340.qgs'
QGS322_PRINT_LAYOUT_THEME_FILE = 'test_print_layout_with_preset_theme.qgs'
QGS322_FILE = 'gruppo-1_un-progetto_qgis322.qgs'
QGS328_FILE = 'gruppo-1_un-progetto_qgis328.qgs'
QGS322_INITEXTENT_GEOCONSTRAINT_FILE = 'test_initextent_by_geoconstraint.qgs'
QGS322_FORMATTING_DATE = 'Testing_Date_and_Datetime_formatting_322.qgs'
QGS328_VALUE_RELATION = 'value_relation_qgis328.qgs'
QGS328_RELATION_REFERENCE = 'g3wsuite_project_test_qgis328.qgs'

@override_settings(
    CACHES={
        'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'some',
        }
    },
    DATASOURCE_PATH=DATASOURCE_PATH,
    LANGUAGE_CODE='en',
    LANGUAGES = (
        ('en', 'English'),
    )
)
class QdjangoTestBase(TestCase):
    """ Qdjango test class base"""

    fixtures = ['BaseLayer.json',
                'G3WMapControls.json',
                'G3WSpatialRefSys.json',
                'G3WGeneralDataSuite.json'
                ]

    @classmethod
    def setUpClass(cls):

        # To load the fixtures
        super().setUpClass()
        setup_testing_user(cls)


    def setUp(self):

        # main project group
        self.project_group = CoreGroup(name='Group1', title='Group1', header_logo_img='',
                                      srid=G3WSpatialRefSys.objects.get(auth_srid=4326))

        self.project_group.save()

        qgis_project_file = File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_FILE), 'r'))
        self.project = QgisProject(qgis_project_file)
        self.project.title = 'A project'
        self.project.group = self.project_group
        self.project.save()

        # Make a fake vector postgis layer
        # ===================================
        fake_layer1, created = Layer.objects.get_or_create(
            name='fakelayer',
            title='fakelayer',
            origname='fakelayer',
            qgs_layer_id='fakelayer_23456',
            project=self.project.instance,
            layer_type='postgres',
            datasource="dbname='geo_demo' host=localhost port=5432 user='postgres' password='postgres' sslmode=disable "
                       "key='id' srid=3003 type=Polygon checkPrimaryKeyUnicity='1' "
                       "table=\"casentino\".\"piano_parco\" (geom) sql="

        )

        fake_layer2, created = Layer.objects.get_or_create(
            name='fakelayer2',
            title='fakelayer2',
            origname='fakelayer2',
            qgs_layer_id='fakelayer2_23456',
            project=self.project.instance,
            layer_type='postgres',
            datasource="dbname='geo_demo' host=localhost port=5432 user='postgres2' password='HHHHH' sslmode=disable "
                       "key='id' srid=3003 type=Polygon checkPrimaryKeyUnicity='1' "
                       "table=\"casentino\".\"piano_parco\" (geom) sql="

        )


        # change datasource
        fake_layer3, created = Layer.objects.get_or_create(
            name='fakelayer3',
            title='fakelayer3',
            origname='fakelayer3',
            qgs_layer_id='fakelayer3_23456',
            project=self.project.instance,
            layer_type='postgres',
            datasource="dbname='geo_demo' host=localhost port=5432 user='postgres1' password='XXXX' sslmode=disable "
                       "key='id' srid=3003 type=Polygon checkPrimaryKeyUnicity='1' "
                       "table=\"casentino\".\"piano_parco\" (geom) sql="

        )

        layers = self.project.instance.layer_set.all()
        for l in layers:
            if l.qgs_layer_id == 'fakelayer_23456':
                self.fake_layer1 = l
            if l.qgs_layer_id == 'fakelayer2_23456':
                self.fake_layer2 = l
            if l.qgs_layer_id == 'fakelayer3_23456':
                self.fake_layer3 = l


        qgis_project_file = File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS310_FILE), 'r'))
        self.project310 = QgisProject(qgis_project_file)
        self.project310.title = 'A project QGIS 3.10'
        self.project310.group = self.project_group
        self.project310.save()



    def tearDown(self):
        """Delete all test data"""

        #ProjectConfig.objects.all().delete()
        try:
            self.fake_layer.delete()
            self.fake_layer2.delete()
            self.fake_layer3.delete()
        except:
            pass

    @classmethod
    def tearDownClass(cls):
        teardown_testing_users(cls)
        super().tearDownClass()