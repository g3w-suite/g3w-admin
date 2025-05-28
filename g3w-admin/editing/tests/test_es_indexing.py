# coding=utf-8
"""" Test actions for indexing QES project in Elasticsearch

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2025-05-28'
__copyright__ = 'Copyright 2015 - 2025, Gis3w'

from django.urls import reverse
from qes.tests.base import QesTesBase, override_settings
from qes.utils.indexer import QGISElasticsearchIndexer
from qdjango.utils.data import QgisProject
from .test_models import (
    QGS_DB,
    QGS_DB_BACKUP,
    QGS_FILE,
    CURRENT_PATH,
    TEST_BASE_PATH,
    CoreGroup,
    G3WSpatialRefSys,
    File
)
import shutil

@override_settings(
        QES_INDEXING_PROJECT=True
)
class QesEditingIndexingTest(QesTesBase):


    @classmethod
    def reset_db_data(cls):
        """
        Reset restore test database
        Is necessary at the end of every single test where data test are changing
        """
        shutil.copy('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_DB_BACKUP),
                    '{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_DB))

    def setUp(self):

        # 3857 Group
        self.project_group= CoreGroup(name='GroupES3857', title='GroupES3857', header_logo_img='',
                                       srid=G3WSpatialRefSys.objects.get(auth_srid=3857))
        self.project_group.save()

        # Make a copy of the test project's databases
        self.reset_db_data()

    def test_indexing_editing_vector(self):
        """ Test for action on CRUD on vector editing for ES indexing"""

        # Reset every ES included indexes
        indexer = QGISElasticsearchIndexer('default', self.test_admin1)
        indexer.delete_all_indexes()

        # ON CREATION
        qgis_project_file = File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_FILE), 'r'))
        project = QgisProject(qgis_project_file)
        project.title = 'A project for ES editing indexing'
        project.group = self.project_group
        project.save()

        kwargs = {
            'project_type': 'qdjango',
            'project_id': project.instance.pk,
            'layer_name': 'editing_layer20190723181842021',
            'mode_call': 'data'
        }

        url = reverse('core-vector-api', kwargs=kwargs)
        self.assertTrue(self.client.login(
            username=self.test_user1.username, password=self.test_user1.username))

        res = self.client.get(url)
        print(res.content)

        # Check
        data = self._query_es('/_cat/indices')
        self.assertEqual(len(data), 2)