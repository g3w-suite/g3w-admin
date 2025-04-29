# coding=utf-8
""""
    Utility functions for Elasticsearch API
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2025-04-29'
__copyright__ = 'Copyright 2025, Gis3w'

# !/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script per indicizzare le feature di tutti i layer di un progetto QGIS in Elasticsearch
per abilitare la ricerca full-text.

Requisiti:
- QGIS 3.x
- elasticsearch-py (installabile con pip install elasticsearch)
"""

from qgis.core import (
    QgsProject,
    QgsVectorLayer,
    QgsRasterLayer,
    QgsMessageLog,
    Qgis
)
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk
from elasticsearch_dsl import connections
import json
import uuid
import os
import datetime


class QGISElasticsearchIndexer:
    """Classe per indicizzare le feature dei layer QGIS in Elasticsearch"""

    def __init__(self, connection, index_name='qgis_features'):
        """
        Inizializza il connettore Elasticsearch

        Args:
            connection (str); Alias of Elasticsearch connection
            index_name (str): Nome dell'indice Elasticsearch
        """
        self.es = connections.get_connection(connection)
        self.index_name = index_name
        self.es = None
        self.log_tag = "QGIS-ES-Indexer"

    def create_index(self):
        """Crea l'indice se non esiste già"""
        if not self.es.indices.exists(index=self.index_name):
            # Definizione della mappatura per l'indice
            mappings = {
                "properties": {
                    "project_id": {"type": "keyword"},
                    "project_name": {"type": "keyword"},
                    "layer_id": {"type": "keyword"},
                    "layer_name": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
                    "feature_id": {"type": "keyword"},
                    "geometry_type": {"type": "keyword"},
                    "geometry": {"type": "geo_shape"},
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
            QgsMessageLog.logMessage(f"Indice '{self.index_name}' creato con successo", self.log_tag, Qgis.Info)
        else:
            QgsMessageLog.logMessage(f"L'indice '{self.index_name}' esiste già", self.log_tag, Qgis.Info)

    def generate_documents(self, project):
        """
        Genera documenti per bulk indexing da tutti i layer vettoriali

        Args:
            project (Qdjango.Models.Project): Qdjango Projetc Model instance

        Returns:
            list: Lista di documenti pronti per l'indicizzazione bulk
        """
        documents = []
        project_name = project.name
        project_id = project.id
        qgis_project = project.qgis_project

        # Processa tutti i layer nel progetto
        for layer_id, layer in qgis_project.mapLayers().items():
            if isinstance(layer, QgsVectorLayer):
                QgsMessageLog.logMessage(f"Elaborazione layer: {layer.name()}", self.log_tag, Qgis.Info)

                # Processa ogni feature nel layer
                for feature in layer.getFeatures():
                    # Estrai gli attributi
                    attrs = {}
                    text_content = []

                    # Processa tutti i campi
                    for field in layer.fields():
                        field_name = field.name()
                        field_value = feature[field_name]

                        # Salva l'attributo
                        attrs[field_name] = field_value

                        # Aggiungi al contenuto testuale per la ricerca full-text
                        if field_value:
                            text_content.append(str(field_value))

                    # Estrai la geometria in formato GeoJSON
                    geometry = None
                    if feature.hasGeometry() and not feature.geometry().isEmpty():
                        geom_wkb = feature.geometry().asWkb()
                        try:
                            # Converti la geometria in GeoJSON
                            geometry = json.loads(feature.geometry().asJson())
                        except Exception as e:
                            QgsMessageLog.logMessage(f"Errore nella conversione della geometria: {str(e)}",
                                                     self.log_tag, Qgis.Warning)

                    # Crea il documento
                    doc = {
                        "_index": self.index_name,
                        "_id": f"{layer_id}_{feature.id()}",
                        "_source": {
                            "project_id": project_id,
                            "project_name": project_name,
                            "layer_id": layer_id,
                            "layer_name": layer.name(),
                            "feature_id": feature.id(),
                            "geometry_type": feature.geometry().type() if feature.hasGeometry() else None,
                            "geometry": geometry,
                            "attributes": attrs,
                            "text_content": " ".join(text_content),
                            "indexed_at": datetime.datetime.now().isoformat()
                        }
                    }
                    documents.append(doc)

            elif isinstance(layer, QgsRasterLayer):
                # Per i layer raster, indicizza solo i metadati generali
                QgsMessageLog.logMessage(f"Elaborazione layer raster: {layer.name()}", self.log_tag, Qgis.Info)

                metadata = {}
                text_content = []

                # Estrai metadati di base
                metadata["width"] = layer.width()
                metadata["height"] = layer.height()
                metadata["crs"] = layer.crs().authid()
                metadata["extent"] = layer.extent().toString()

                # Aggiungi metadati al contenuto testuale
                for key, value in metadata.items():
                    text_content.append(f"{key}: {value}")

                # Crea il documento
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
        Indicizza tutti i layer del progetto QGIS corrente o specificato

        Args:
            project (QgsProject, optional): Progetto QGIS da indicizzare.
                                           Se None, usa il progetto corrente.

        Returns:
            tuple: (successo, numero di documenti indicizzati)
        """

        # Crea l'indice se necessario
        self.create_index()

        # Genera i documenti da indicizzare
        documents = self.generate_documents(project)

        # Effettua l'indicizzazione in bulk
        if documents:
            try:
                success, failed = bulk(self.es, documents, refresh=True)
                QgsMessageLog.logMessage(f"Indicizzati {success} documenti, falliti {len(failed) if failed else 0}",
                                         self.log_tag, Qgis.Info)
                return True, success
            except Exception as e:
                QgsMessageLog.logMessage(f"Errore nell'indicizzazione: {str(e)}",
                                         self.log_tag, Qgis.Critical)
                return False, 0
        else:
            QgsMessageLog.logMessage("Nessun documento da indicizzare", self.log_tag, Qgis.Warning)
            return True, 0

    def search(self, query_text, filters=None, size=100):
        """
        Esegue una ricerca full-text nell'indice

        Args:
            query_text (str): Testo da cercare
            filters (dict, optional): Filtri aggiuntivi (es: layer_name, project_name)
            size (int): Numero massimo di risultati

        Returns:
            list: Lista dei risultati della ricerca
        """
        if not self.es:
            if not self.connect():
                return []

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

        # Esegui la ricerca
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
            QgsMessageLog.logMessage(f"Errore nella ricerca: {str(e)}", self.log_tag, Qgis.Critical)
            return []


def run_indexer():
    """Funzione per eseguire l'indicizzazione dalla console Python di QGIS"""
    indexer = QGISElasticsearchIndexer()
    success, count = indexer.index_project()
    return success, count


def search_features(query_text, filters=None):
    """Funzione per cercare feature dalla console Python di QGIS"""
    indexer = QGISElasticsearchIndexer()
    results = indexer.search(query_text, filters)
    return results


