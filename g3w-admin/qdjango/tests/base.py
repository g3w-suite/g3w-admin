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
from qdjango.utils.data import QgisProject
from qdjango.models import Layer, Widget


CURRENT_PATH = os.getcwd()
TEST_BASE_PATH = '/qdjango/tests/data/'
DATASOURCE_PATH = '{}{}un-progetto-data'.format(CURRENT_PATH, TEST_BASE_PATH)
QGS2_FILE = 'gruppo-1_un-progetto.qgs'
QGS_FILE = 'gruppo-1_un-progetto_qgis34.qgs'
QGS310_FILE = 'g3wsuite_project_test_qgis310.qgs'


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
    def setUpTestData(cls):

        # Admin level 1
        cls.test_user_admin1 = User.objects.create_user(username='admin01', password='admin01')
        cls.test_user_admin1.is_superuser = True
        cls.test_user_admin1.save()

        # Editor Level 1
        cls.test_user1 = User.objects.create_user(username='user1', password='user1')
        cls.group = UserGroup.objects.get(name='Editor Level 1')
        cls.test_user1.groups.add(cls.group)
        cls.test_user1.save()

        # main project group
        cls.project_group = CoreGroup(name='Group1', title='Group1', header_logo_img='',
                                      srid=G3WSpatialRefSys.objects.get(auth_srid=3003))
        cls.project_group.save()

        qgis_project_file = File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_FILE), 'r'))
        cls.project = QgisProject(qgis_project_file)
        cls.project.title = 'A project'
        cls.project.group = cls.project_group
        cls.project.save()

        # make a fake vector postgis layer
        # ===================================
        cls.fake_layer = Layer(
            name='fakelayer',
            title='fakelayer',
            origname='fakelayer',
            qgs_layer_id='fakelayer_23456',
            project=cls.project.instance,
            layer_type='postgres',
            datasource="dbname='geo_demo' host=localhost port=5432 user='postgres' password='postgres' sslmode=disable "
                       "key='id' srid=3003 type=Polygon checkPrimaryKeyUnicity='1' "
                       "table=\"casentino\".\"piano_parco\" (geom) sql="

        )
        cls.fake_layer.save()

        cls.fake_layer2 = Layer(
            name='fakelayer2',
            title='fakelayer2',
            origname='fakelayer2',
            qgs_layer_id='fakelayer2_23456',
            project=cls.project.instance,
            layer_type='postgres',
            datasource="dbname='geo_demo' host=localhost port=5432 user='postgres2' password='HHHHH' sslmode=disable "
                       "key='id' srid=3003 type=Polygon checkPrimaryKeyUnicity='1' "
                       "table=\"casentino\".\"piano_parco\" (geom) sql="

        )
        cls.fake_layer2.save()

        # change datasource
        cls.fake_layer3 = Layer(
            name='fakelayer3',
            title='fakelayer3',
            origname='fakelayer3',
            qgs_layer_id='fakelayer3_23456',
            project=cls.project.instance,
            layer_type='postgres',
            datasource="dbname='geo_demo' host=localhost port=5432 user='postgres1' password='XXXX' sslmode=disable "
                       "key='id' srid=3003 type=Polygon checkPrimaryKeyUnicity='1' "
                       "table=\"casentino\".\"piano_parco\" (geom) sql="

        )
        cls.fake_layer3.save()




    def tearDown(self):
        """Delete all test data"""

        #ProjectConfig.objects.all().delete()
        try:
            self.fake_layer.delete()
            self.fake_layer2.delete()
            self.fake_layer3.delete()
        except:
            pass