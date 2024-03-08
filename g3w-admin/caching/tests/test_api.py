# coding=utf-8
""""Caching api tests.

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-05-15'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'


from django.test.client import Client
from django.test.testcases import LiveServerTestCase
from django.test import override_settings
from django.core.management import call_command
from django.urls import reverse
from django.core.files import File
from django.core.exceptions import ObjectDoesNotExist
from guardian.shortcuts import assign_perm
from caching.utils import get_config, TilestacheConfig
from usersmanage.tests.utils import setup_testing_user, teardown_testing_users
from qdjango.utils.data import QgisProject
from qdjango.tests.base import QGS_FILE
from core.models import Group as CoreGroup, G3WSpatialRefSys
from .base import CURRENT_PATH, TEST_BASE_PATH
from qdjango.models import Layer
from caching.models import G3WCachingLayer
import requests

@override_settings(
    TILESTACHE_CACHE_NAME='default',
    TILESTACHE_CACHE_TYPE='Disk',
    TILESTACHE_CACHE_DISK_PATH=f'{CURRENT_PATH}${TEST_BASE_PATH}',
    TILESTACHE_CACHE_TOKEN='1234567',
    QDJANGO_SERVER_URL='http://localhost:55432',
    DATASOURCE_PATH=f'{CURRENT_PATH}/qdjango/tests/data/geodata/'
)
class CachingAPITests(LiveServerTestCase):

    fixtures = ['BaseLayer.json',
                'G3WMapControls.json',
                'G3WSpatialRefSys.json',
                'G3WGeneralDataSuite.json'
                ]

    port = 55432

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        if cls.fixtures:
            for db_name in cls._databases_names(include_mirrors=False):
                try:
                    call_command('loaddata', *cls.fixtures, **{'verbosity': 0, 'database': db_name})
                except Exception:
                    cls._rollback_atomics(cls.cls_atomics)
                    cls._remove_databases_failures()
                    raise

        setup_testing_user(cls)

        # main project group
        cls.project_group = CoreGroup(name='Group1', title='Group1', header_logo_img='',
                                      srid=G3WSpatialRefSys.objects.get(auth_srid=4326))
        cls.project_group.save()

        qgis_project_file = File(open('{}{}{}'.format(CURRENT_PATH, '/caching/tests/data/', QGS_FILE), 'r'))
        cls.project = QgisProject(qgis_project_file)
        cls.project.title = 'A project'
        cls.project.group = cls.project_group
        cls.project.save()


    def test_tilestache_api(self):
        """Testing titlestache api tile generation"""

        client = Client()
        layer = Layer.objects.get(project=self.project.instance, qgs_layer_id='spatialite_points20190604101052075')
        assign_perm('view_project', self.anonymoususer, self.project.instance)
        for l in self.project.instance.layer_set.all():
            assign_perm("view_layer", self.anonymoususer, l)

        # active caching for layer
        cachinglayer = G3WCachingLayer.objects.create(app_name='qdjango', layer_id=layer.pk)

        # init tilestache
        TilestacheConfig.set_cache_config_dict(TilestacheConfig().config_dict)

        url = reverse('caching-api-tile', args=[f'qdjango{layer.pk}', 0, 0, 0, 'png'])
        #url = f'{self.live_server_url}{url}'
        self.assertTrue(client.login(username=self.test_admin1.username, password=self.test_admin1.username))


        res = client.get(url)
        self.assertEqual(res.status_code, 200)

        client.logout()

    @classmethod
    def tearDownClass(cls):
        teardown_testing_users(cls)
        super().tearDownClass()
