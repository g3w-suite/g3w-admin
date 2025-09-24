# coding=utf-8
""""
    Utility functions for Elasticsearch API
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2025-04-29'
__copyright__ = 'Copyright 2025, Gis3w'


from django.conf import settings
from django.urls import reverse, resolve
from django.http import HttpRequest
from qdjango.vector import LayerVectorView
from usersmanage.models import User

from qgis.core import (
    QgsVectorLayer,
    QgsRasterLayer,
    QgsWkbTypes
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

    def __init__(self, connection, user, index_name='qgis_features', **kwargs):
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
        self.index_name = f"{index_name}_{self.user.pk}" if not self.user.is_anonymous else f"{index_name}_anonymous"
        self.log_tag = "[QES-elasticsearch]: "

        # Check for Huey process info
        if 'process_info' in kwargs:
            self.process_info = kwargs['process_info']

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
                    "text_content": {
                        "type": "text", 
                        "analyzer": "standard",
                        "fields": {
                            "raw": {
                            "type": "keyword",
                            "normalizer": "lowercase_normalizer"
                            }
                        }
                    },
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
                    },
                    "normalizer": {
                        "lowercase_normalizer": {
                            "type": "custom",
                            "char_filter": [],
                            "filter": ["lowercase"]
                        }
                    }
                }
            }

            self.es.indices.create(
                index=self.index_name,
                body={"mappings": mappings, "settings": settings}
            )
            logger.info(f"{self.log_tag}Index '{self.index_name}' sucessfully created")
        else:
            logger.info(f"{self.log_tag}Index '{self.index_name}' exists, no need to create it")

    def make_documents(self, project, qlayer, features):
        """
        Give GEOJson features and return a list of documents for ES

        :param project: Qdjango Project Model instance
        :param qlayer: QGIS Layer instance
        :param features: List of features in GEOJson format
        :return: List of documents ready for bulk indexing
        """

        documents = []
        project_name = project.title
        project_id = project.id

        for feature in features:

            # Create text_content
            text_content = []
            attributes = {}
            for k, v in feature['properties'].items():
                if v is not None:

                    # Check for indexing fields settings
                    # If settings.QES_INDEXING_FIELDS is set, only fields in the list are indexed
                    if settings.QES_INDEXING_FIELDS and settings.QES_INDEXING_FIELDS.get(qlayer.id()) and \
                       k not in settings.QES_INDEXING_FIELDS[qlayer.id()]:
                        continue

                    # Case for nested dictionaries, i.e for media file:
                    # -------------------------------------------------
                    # "form": {
                    #     "value": "https://v36.g3wsuite.it/en/me/qdjango/353/building_detection_card.pdf",
                    #     "mime_type": null
                    # }
                    # -------------------------------------------------
                    if isinstance(v, dict):
                        for subk, subv in v.items():
                            if subv is not None and subk == 'value':
                                text_content.append(subv)
                                attributes[k] = v
                    else:
                        text_content.append(str(v))
                        attributes[k] = str(v)

            # Extract the attributes
            # Create ES document
            doc = {
                "_index": self.index_name,
                "_id": f"{project_id}_{qlayer.id()}_{feature['id']}",
                "_source": {
                    "project_id": project_id,
                    "project_name": project_name,
                    "layer_id": qlayer.id(),
                    "layer_name": qlayer.name(),
                    "feature_id": feature['id'],
                    "geometry_type": "",
                    # "geometry": feature['geometry'],
                    "attributes": attributes,
                    "text_content": " ".join(text_content),
                    "indexed_at": datetime.datetime.now().isoformat()
                }
            }

            documents.append(doc)

        return documents

    def get_features_from_api(self, project_id, layer_id, feature_ids=None):
        """
        Execute a request to /vector/api/data to get formatted features

        :param project_id: QGIS project id
        :param layer_id: QGIS layer id
        :param feature_ids: List of feature ids to filter
        :return: List of features in GEOJson format
        """

        kwargs = {
            'project_type': 'qdjango',
            'project_id': project_id,
            'layer_name': layer_id,
            'mode_call': 'data'
        }

        url = reverse('core-vector-api', kwargs=kwargs)
        req = HttpRequest()
        req.method = 'GET'
        req.user = self.user
        req.resolver_match = resolve(url)
        req.GET['formatter'] = 1

        if feature_ids:
            req.GET['fids'] = ','.join([str(f) for f in feature_ids])

        view = LayerVectorView.as_view()
        res = view(req, *[], **kwargs).render()

        return json.loads(res.content)

    def generate_documents_from_api(self, project, layer=None, feature_ids=None):
        """
        Generates documents for bulk indexing from all vector layers by calling the G3W-SUITE /api/data.

        :param project: Qdjango Project Model instance
        :param layer: Qdjango Layer instance (optional)
        :param feature_ids: List of feature ids to filter
        :return: List of documents ready for bulk indexing
        """

        documents = []
        project_name = project.title
        project_id = project.id
        qgis_project = project.qgis_project

        # Check for layer
        # set a list with one layer or default every layer of the project
        if layer:
            qlayers = [(layer.qgs_layer_id, layer.qgis_layer)]
        else:
            qlayers = qgis_project.mapLayers().items()


        for layer_id, qlayer in qlayers:

            if not isinstance(qlayer, QgsVectorLayer):
                continue

            # Check for indexing fields settings
            if settings.QES_INDEXING_FIELDS and not settings.QES_INDEXING_FIELDS.get(qlayer.id()):
                continue

            # Get features from API
            features = self.get_features_from_api(project_id, layer_id, feature_ids)

            # Create documents for ES
            documents += self.make_documents(project, qlayer, features['vector']['data']['features'])

        return documents

    def push_documents(self, documents):
        """
        Push documents to ES index

        :param documents: List of documents to push
        """

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
                logger.info(
                    f"{self.log_tag}Indexed {success} documents, failed {len(bulk_failed) if bulk_failed else 0}")

                success_message = (
                    f"Indexing completed.\n"
                    f"- Documents successfully indexed: {success}\n"
                    f"- Documents failed during bulk: {len(bulk_failed)}\n"
                    f"- Total processed items: {success + len(bulk_failed)}\n"
                )

                logger.info(f"{self.log_tag}{success_message}")

                if bulk_failed:
                    failed_details = []
                    for error in bulk_failed:
                        if 'index' in error and 'error' in error['index']:
                            doc_id = error['index'].get('_id', 'Unknown')
                            error_type = error['index']['error'].get('type', 'Unknown')
                            error_reason = error['index']['error'].get('reason', 'Unknown')
                            failed_details.append(f"Doc ID: {doc_id}, Errore: {error_type} - {error_reason}")

                    log_errors = failed_details[:10]
                    if len(failed_details) > 10:
                        log_errors.append(f"... end other {len(failed_details) - 10} errors")

                    logger.info(f"{self.log_tag}Bulk indexes details errors:\n" + "\n".join(log_errors))

                return True, success
            except Exception as e:
                logger.info(f"{self.log_tag}Indexes error: {str(e)}")
                return False, 0
        else:
            logger.info(f"{self.log_tag}No doc to index")
            return True, 0

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
                logger.info(f"{self.log_tag}Elaborazione layer: {layer.name()}")

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
                            logger.info(f"{self.log_tag}Errore nella conversione della geometria delle feature id {feature.id()}: {str(e)}")
                            logger.info(f"{self.log_tag}Geometria: {geometry}")

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
                logger.info(f"{self.log_tag}Elaboration raster layer: {layer.name()}")

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

    def index_project(self, project, layer=None, feature_ids=None):
        """
        Indexes all layers of the current or specified QGIS project.

        :param project: Qdjango Project Model instance
        :return: Tuple with success status and number of indexed documents
        """

        # Create index if it does not exist
        self.create_index()

        # Generate the documents from the API
        self.push_documents(self.generate_documents_from_api(project, layer, feature_ids))


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

        def replace_placeholder(d, placeholder, value):
            if isinstance(d, dict):
                return {k: replace_placeholder(v, placeholder, value) for k, v in d.items()}
            elif isinstance(d, list):
                return [replace_placeholder(v, placeholder, value) for v in d]
            elif d in (placeholder, f"*{placeholder}*"):
                if d == placeholder:
                    return value
                else:
                    return f"*{value}*"
            else:
                return d


        query = replace_placeholder(settings.QES_SEARCH_QUERY, '$query_text', query_text)

        # Add specific filters
        if filters:
            for key, value in filters.items():
                if key == "layer_id":
                    query["bool"]["filter"] = query["bool"].get("filter", [])
                    query["bool"]["filter"].append({"term": {"layer_name.keyword": value}})
                elif key == "project_id":
                    query["bool"]["filter"] = query["bool"].get("filter", [])
                    query["bool"]["filter"].append({"term": {"project_id": value}})
                elif key == "geometry_type":
                    query["bool"]["filter"] = query["bool"].get("filter", [])
                    query["bool"]["filter"].append({"term": {"geometry_type": value}})

        # Query execution
        try:
            response = self.es.search(
                index=self.index_name,
                body={
                    "query": query,
                    "sort": settings.QES_SEARCH_SORT,
                    "size": size,
                    "highlight": {
                        "fields": {
                            "text_content": {},
                            "attributes.*": {}
                        }
                    }
                }
            )

            # Extract and format the results
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
            logger.info(f"{self.log_tag}Search errors: {str(e)}")
            return []

    def delete_index(self):
        """Delete the ES index if it exists"""

        if self.es.indices.exists(index=self.index_name):
            self.es.indices.delete(index=self.index_name)
            logger.info(f"{self.log_tag}Index '{self.index_name}' removed successfully")
        else:
            logger.info(f"{self.log_tag}Index '{self.index_name}' doesn't exist")

    def delete_all_indexes(self):
        """
        Delete all indexes in ES
        """
        for i in self.es.cat.indices(format='json'):
            self.es.indices.delete(index=i['index'])

        logger.info(f"{self.log_tag}All indexes removed successfully")

    def delete_documents(self, project, layer=None, feature_ids=None):
        """
        Delete all documents related to a specific project

        :param project: Qdjango Project Model instance
        :return: Result of the delete operation
        """

        # Delete all documents related to the project
        # -------------------------------------------------------
        query = {
            "query": {
                "bool": {
                    "filter": {"term": {"project_id": project.id}}
                }
            }
        }

        # If layer is specified, add it to the query
        # -------------------------------------------------------
        if layer:
            query["query"]["bool"]["filter"] = {
                "bool": {
                    "must": [
                        {"term": {"project_id": project.id}},
                        {"term": {"layer_id": layer.qgs_layer_id}},
                    ]
                }
            }
        # If feature_ids is specified, add it to the query
        # -------------------------------------------------------
        if layer and feature_ids:

            query["query"]["bool"]["filter"]["bool"]["must"].append ({
                "terms": {"feature_id": [str(fid) for fid in feature_ids]}
            })

        result = self.es.delete_by_query(index=self.index_name, body=query)

        success_message = (
            f"Delete documents completed.\n"
            f"- Documents successfully deleted: {result['total']}\n"
            f"- Documents failed in delete: {result['failures']}\n"
        )

        logger.info(f"{self.log_tag}Delete documents from index '{self.index_name}' {success_message}")
        
        return result
