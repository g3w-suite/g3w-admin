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
from editing.models import (
    G3WEditingLayer
)
from .test_models import (
    QGS_DB,
    QGS_DB_BACKUP,
    CURRENT_PATH,
    TEST_BASE_PATH,
    CoreGroup,
    G3WSpatialRefSys,
    File,
    DATASOURCE_PATH
)
import shutil
import json

QGS_FILE = 'constraints_test_project_340.qgs'

@override_settings(
        DATASOURCE_PATH=DATASOURCE_PATH,
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

    def _query_es_get_docs_by_layer_name(self):
        data = self._query_es(f'/qgis_features_{self.test_user1.pk}/_search', method='POST', **{
            "data": {
                "query": {
                    "term": {
                        "layer_name": "editing_layer"
                    }
                }
            }
        })
        return data

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

        editing_layer_id = 'editing_layer20190723181842021'

        editing_layer = project.instance.layer_set.get(qgs_layer_id=editing_layer_id)

        # Check
        data = self._query_es('/_cat/indices')
        self.assertEqual(len(data), 2)

        data = self._query_es_get_docs_by_layer_name()
        self.assertEqual(data['hits']['total']['value'], 4)

        # Activate editing plugins: set cities as editing layer
        G3WEditingLayer.objects.create(
            app_name='qdjango', layer_id=editing_layer.pk)


        commit_path = reverse('editing-commit-vector-api',
                              args=['commit', 'qdjango', project.instance.pk, editing_layer_id])

        self.assertTrue(
            self.client.login(username=self.test_user1.username, password=self.test_user1.username))

        # ADD
        # ======
        payload = {
            "add":[
              {
                 "type":"Feature",
                 "geometry":{
                    "type":"Point",
                    "coordinates":[7.33838613174764, 44.8332105526191]
                 },
                 "properties":{
                    "pkuid":None,
                    "name":"ES 1"
                 },
                 "id":"_new_127_1748419353300"
              }
           ],
           "update":[],
           "delete":[],
           "relations":{},
           "lockids":[]
        }


        response = self.client.post(commit_path, payload, format='json', content_type='application/json')
        self.assertEqual(response.status_code, 200)
        jresult = json.loads(response.content)
        self.assertTrue(jresult['result'])

        newid = jresult['response']['new'][0]['id']
        newlockid = jresult['response']['new_lockids'][0]['lockid']

        data = self._query_es_get_docs_by_layer_name()
        self.assertEqual(data['hits']['total']['value'], 5)

        # Check for specific new document
        _id = f"{project.instance.pk}_{editing_layer_id}_{newid}"
        data = self._query_es(f'/qgis_features_{self.test_user1.pk}/_doc/{_id}')
        self.assertEqual(data['_source']['attributes']['name'], 'ES 1')

        # UPDATE
        # ======

        payload = {
            "update": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [7.33838613174764, 44.8332105526191]
                    },
                    "properties": {
                        "pkuid": newid,
                        "name": "ES 1 updated"
                    },
                    "id": newid
                }
            ],
            "add": [],
            "delete": [],
            "relations": {},
            "lockids": [
                {
                    "featureid": newid,
                    "lockid": newlockid
                }
            ]
        }

        response = self.client.post(commit_path, payload, format='json', content_type='application/json')
        self.assertEqual(response.status_code, 200)
        jresult = json.loads(response.content)
        self.assertTrue(jresult['result'])

        data = self._query_es_get_docs_by_layer_name()
        self.assertEqual(data['hits']['total']['value'], 5)

        # Check for specific new document
        _id = f"{project.instance.pk}_{editing_layer_id}_{newid}"
        data = self._query_es(f'/qgis_features_{self.test_user1.pk}/_doc/{_id}')
        self.assertEqual(data['_source']['attributes']['name'], 'ES 1 updated')

        # DELETE
        # ======

        payload = {
            "update": [],
            "delete": [
                newid
            ],
            "lockids": [
                {
                    "featureid": newid,
                    "lockid": newlockid
                }
            ],
            "relations": {},
            "add": []
        }

        response = self.client.post(commit_path, payload, format='json', content_type='application/json')
        self.assertEqual(response.status_code, 200)
        jresult = json.loads(response.content)
        self.assertTrue(jresult['result'])

        data = self._query_es_get_docs_by_layer_name()
        self.assertEqual(data['hits']['total']['value'], 4)