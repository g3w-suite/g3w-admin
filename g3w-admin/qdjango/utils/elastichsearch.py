# coding=utf-8
""""
    Utility functions for Elasticsearch API
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2025-04-29'
__copyright__ = 'Copyright 2025, Gis3w'



from django.urls import reverse, resolve
from django.http import HttpRequest
from qdjango.vector import LayerVectorView
from usersmanage.models import User

from qgis.core import (
    QgsVectorLayer,
    QgsRasterLayer,
    QgsWkbTypes,
    Qgis
)
from elasticsearch.helpers import bulk
from elasticsearch_dsl import connections
import json
import datetime

from qgis.PyQt.QtCore import NULL

import logging

logger = logging.getLogger('elasticsearch')


class QGISElasticsearchIndexer:
    """Class to index QGIS layer features in Elasticsearch"""

    def __init__(self, connection, user, index_name='qgis_features'):
        """
        Initialize the Elasticsearch connector

        Args:
            connection (str): Alias of the Elasticsearch connection
            user (User): Instance of Django User model
            index_name (str): Name of the Elasticsearch index
        """
        self.es = connections.get_connection(connection)
        self.user = user

        # Set the index name with suffix for user id
        self.index_name = f"{index_name}_{self.user.pk}"
        self.log_tag = "QGIS-ES-Indexer"

    def create_index(self):
        """Create the index if it does not already exist"""

        if not self.es.indices.exists(index=self.index_name):

            # Index mapping definition
            mappings = {
                "properties": {
                    "project_id": {"type": "keyword"},
                    "project_name": {"type": "keyword"},
                    "layer_id": {"type": "keyword"},
                    "layer_name": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
                    "feature_id": {"type": "keyword"},
                    "geometry_type": {"type": "keyword"},
                    #"geometry": {"type": "geo_shape"},
                    "attributes": {"type": "object", "dynamic": True},
                    "text_content": {"type": "text", "analyzer": "standard"},
                    "indexed_at": {"type": "date"}
                }
            }

            settings = {
                "number_of_shards": 1,
                "number_of_replicas": 0,
                "analysis": {
                    "analyzer": {
                        "custom_analyzer": {
                            "type": "custom",
                            "tokenizer": "standard",
                            "filter": ["lowercase", "asciifolding"]
                        }
                    }
                }
            }

            self.es.indices.create(
                index=self.index_name,
                body={"mappings": mappings, "settings": settings}
            )
            logger.info(f"Indice '{self.index_name}' creato con successo")
        else:
            logger.info(f"L'indice '{self.index_name}' esiste già")

    def generate_documents_from_api(self, project):
        """
        Generates documents for bulk indexing from all vector layers by calling the G3W-SUITE /api/data.

        Args:
            project (Qdjango.Models.Project): Qdjango Project Model instance

        Returns:
            list: List of documents ready for bulk indexing
        """

        documents = []
        project_name = project.title
        project_id = project.id
        qgis_project = project.qgis_project

        for layer_id, layer in qgis_project.mapLayers().items():

            if not isinstance(layer, QgsVectorLayer):
                continue

            kwargs = {
                'project_type': 'qdjango',
                'project_id': project_id,
                'layer_name': layer_id,
                'mode_call': 'data'
            }



            url = reverse('core-vector-api', kwargs=kwargs)
            req = HttpRequest()
            req.method = 'GET'
            req.user = User.objects.get(username='admin01')
            req.resolver_match = resolve(url)

            view = LayerVectorView.as_view()
            res = view(req, *[], **kwargs).render()
            features = json.loads(res.content)

            for feature in features['vector']['data']['features']:

                # Create ES document
                doc = {
                    "_index": self.index_name,
                    "_id": f"{project_id}_{layer_id}_{feature['id']}",
                    "_source": {
                        "project_id": project_id,
                        "project_name": project_name,
                        "layer_id": layer_id,
                        "layer_name": layer.name(),
                        "feature_id": feature['id'],
                        "geometry_type": "",
                        #"geometry": feature['geometry'],
                        "attributes": feature['properties'],
                        "text_content": " ".join([str(v) for v in feature['properties'].values()]),
                        "indexed_at": datetime.datetime.now().isoformat()
                    }
                }

                documents.append(doc)

        return documents

    def generate_documents(self, project):
        """
        Generates documents for bulk indexing from all vector layers

        Args:
            project (Qdjango.Models.Project): Qdjango Project Model instance

        Returns:
            list: List of documents ready for bulk indexing
        """
        documents = []
        project_name = project.title
        project_id = project.id
        qgis_project = project.qgis_project

        self.generate_documents_from_api(project)

        # Porecess every layer in the project
        for layer_id, layer in qgis_project.mapLayers().items():
            if isinstance(layer, QgsVectorLayer):
                logger.info(f"Elaborazione layer: {layer.name()}")

                # Process every feature in the layer
                for feature in layer.getFeatures():
                    # Extract the attributes
                    attrs = {}
                    text_content = []

                    # Process the attributes
                    for field in layer.fields():
                        field_name = field.name()
                        field_value = feature[field_name]

                        # Save attribute value
                        if field_value == NULL:

                            field_value = None
                        attrs[field_name] = field_value

                        # Add the value to the text content
                        if field_value:
                            text_content.append(str(field_value))

                    # Extract the geometry in GeoJSON format
                    geometry = None
                    geometry_type = None
                    if feature.hasGeometry() and not feature.geometry().isEmpty():
                        geometry_type = QgsWkbTypes.displayString(feature.geometry().wkbType())
                        try:
                            qgeometry = feature.geometry()

                            # Check geometry is valid, try to fix
                            if not qgeometry.isGeosValid():
                                qgeometry = qgeometry.makeValid()

                            # To GeoJSON
                            geometry = json.loads(qgeometry.asJson())

                            # Check again, is not valid create an empty geometry
                            if not qgeometry.isGeosValid():
                                geometry = {
                                    "type": "GeometryCollection",
                                    "geometries": []
                                }

                        except Exception as e:
                            logger.info(f"Errore nella conversione della geometria delle feature id {feature.id()}: {str(e)}")
                            logger.info(f"Geometria: {geometry}")

                    # Create ES document
                    doc = {
                        "_index": self.index_name,
                        "_id": f"{project_id}_{layer_id}_{feature.id()}",
                        "_source": {
                            "project_id": project_id,
                            "project_name": project_name,
                            "layer_id": layer_id,
                            "layer_name": layer.name(),
                            "feature_id": feature.id(),
                            "geometry_type": geometry_type,
                            "geometry": geometry,
                            "attributes": attrs,
                            "text_content": " ".join(text_content),
                            "indexed_at": datetime.datetime.now().isoformat()
                        }
                    }

                    documents.append(doc)

            elif isinstance(layer, QgsRasterLayer):

                # For raster only metadata are indexed
                logger.info(f"Elaboration raster layer: {layer.name()}")

                metadata = {}
                text_content = []

                # Extract metadata
                metadata["width"] = layer.width()
                metadata["height"] = layer.height()
                metadata["crs"] = layer.crs().authid()
                metadata["extent"] = layer.extent().toString()

                # Add metadata to text content
                for key, value in metadata.items():
                    text_content.append(f"{key}: {value}")

                # Create ES document
                doc = {
                    "_index": self.index_name,
                    "_id": f"raster_{layer_id}",
                    "_source": {
                        "project_id": project_id,
                        "project_name": project_name,
                        "layer_id": layer_id,
                        "layer_name": layer.name(),
                        "feature_id": None,
                        "geometry_type": "raster",
                        "geometry": None,
                        "attributes": metadata,
                        "text_content": " ".join(text_content),
                        "indexed_at": datetime.datetime.now().isoformat()
                    }
                }
                documents.append(doc)


        return documents

    def index_project(self, project):
        """
        Indexes all layers of the current or specified QGIS project.

        Args:
            project (QgsProject, optional): QGIS project to index.
                                            If None, uses the current project.

        Returns:
            tuple: (success, number of indexed documents)
        """

        # Crdate index if it does not exist
        self.create_index()

        # Generate the documents from the API
        documents = self.generate_documents_from_api(project)

        # Execute the bulk indexing
        if documents:
            try:

                bulk_options = {
                    'refresh': True,
                    'chunk_size': 500,  # Batch dimention to avoid memory issues
                    'raise_on_error': False,  # Continue on error
                    'max_retries': 3,  # Try to reindex 3 times
                    'initial_backoff': 2,  # Timeto wait before retrying (in seconds)
                    'max_backoff': 600  # Max time to wait before retrying (in seconds)
                }

                success, bulk_failed = bulk(self.es, documents, **bulk_options)
                logger.info(f"Indexed {success} documents, failed {len(bulk_failed) if bulk_failed else 0}")

                success_message = (
                    f"Indexing completed.\n"
                    f"- Documents successfully indexed: {success}\n"
                    f"- Documents failed during bulk: {len(bulk_failed)}\n"
                    f"- Total processed items: {success + len(bulk_failed)}\n"
                )

                logger.info(success_message)

                if bulk_failed:
                    failed_details = []
                    for error in bulk_failed:
                        if 'index' in error and 'error' in error['index']:
                            doc_id = error['index'].get('_id', 'Unknown')
                            error_type = error['index']['error'].get('type', 'Unknown')
                            error_reason = error['index']['error'].get('reason', 'Unknown')
                            failed_details.append(f"Doc ID: {doc_id}, Errore: {error_type} - {error_reason}")

                    # Limita il log a 10 errori per evitare log troppo lunghi
                    log_errors = failed_details[:10]
                    if len(failed_details) > 10:
                        log_errors.append(f"... e altri {len(failed_details) - 10} errori")

                    logger.info(f"Dettagli degli errori di indicizzazione bulk:\n" + "\n".join(log_errors))

                return True, success
            except Exception as e:
                logger.info(f"Errore nell'indicizzazione: {str(e)}")
                return False, 0
        else:
            logger.info("Nessun documento da indicizzare")
            return True, 0

    def search(self, query_text, filters=None, size=100):
        """
        Performs a full-text search in the index

        Args:
            query_text (str): Text to search
            filters (dict, optional): Additional filters (e.g., layer_name, project_name)
            size (int): Maximum number of results

        Returns:
            list: List of search results
        """

        # Crea la query di base
        query = {
            "bool": {
                "must": [
                    {"multi_match": {
                        "query": query_text,
                        "fields": ["text_content^2", "layer_name", "attributes.*"],
                        "type": "best_fields",
                        "fuzziness": "AUTO"
                    }}
                ]
            }
        }

        # Aggiungi filtri se specificati
        if filters:
            for key, value in filters.items():
                if key == "layer_name":
                    query["bool"]["filter"] = query["bool"].get("filter", [])
                    query["bool"]["filter"].append({"term": {"layer_name.keyword": value}})
                elif key == "project_name":
                    query["bool"]["filter"] = query["bool"].get("filter", [])
                    query["bool"]["filter"].append({"term": {"project_name": value}})
                elif key == "geometry_type":
                    query["bool"]["filter"] = query["bool"].get("filter", [])
                    query["bool"]["filter"].append({"term": {"geometry_type": value}})

        # Query execution
        try:
            response = self.es.search(
                index=self.index_name,
                body={
                    "query": query,
                    "size": size,
                    "highlight": {
                        "fields": {
                            "text_content": {},
                            "attributes.*": {}
                        }
                    }
                }
            )

            # Estrai e formatta i risultati
            results = []
            for hit in response["hits"]["hits"]:
                source = hit["_source"]
                highlight = hit.get("highlight", {})

                result = {
                    "score": hit["_score"],
                    "project_id": source["project_id"],
                    "project_name": source["project_name"],
                    "layer_id": source["layer_id"],
                    "layer_name": source["layer_name"],
                    "feature_id": source["feature_id"],
                    "attributes": source["attributes"],
                    "highlights": highlight
                }
                results.append(result)

            return results

        except Exception as e:
            logger.info(f"Errore nella ricerca: {str(e)}", self.log_tag, Qgis.Critical)
            return []

    def delete_index(self):
        """Elimina l'indice Elasticsearch"""
        if self.es.indices.exists(index=self.index_name):
            self.es.indices.delete(index=self.index_name)
            logger.info(f"Index '{self.index_name}' removed successfully")
        else:
            logger.info(f"Index '{self.index_name}' doesn't exist")





